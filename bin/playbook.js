#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');

// ---------------------------------------------------------------------------
// Paths (resolved relative to this script, works whether run via npx or clone)
// ---------------------------------------------------------------------------

const PKG_ROOT = path.resolve(__dirname, '..');
const PKG_JSON = require(path.join(PKG_ROOT, 'package.json'));
const PKG_VERSION = PKG_JSON.version;

const SRC_PLAYBOOK = path.resolve(PKG_ROOT, 'playbook');
const SRC_TEMPLATES = path.resolve(PKG_ROOT, 'templates');

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

const FLAG_DRY_RUN = args.includes('--dry-run');
const FLAG_VERSION = args.includes('--version');
const FLAG_HELP = args.includes('--help') || args.includes('-h');

const fromIdx = args.indexOf('--from');
const FLAG_FROM = fromIdx !== -1 ? args[fromIdx + 1] : null;

const SUBCOMMAND = args.find((a) => !a.startsWith('-'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  process.stdout.write(msg + '\n');
}

function warn(msg) {
  process.stderr.write(`  warning: ${msg}\n`);
}

// Copy srcDir → destDir, skipping files that already exist at dest.
// Returns { copied, skipped } arrays of absolute paths.
function copyIfAbsent(srcDir, destDir, dryRun) {
  const result = { copied: [], skipped: [] };
  if (!dryRun) fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      const sub = copyIfAbsent(srcPath, destPath, dryRun);
      result.copied.push(...sub.copied);
      result.skipped.push(...sub.skipped);
    } else if (fs.existsSync(destPath)) {
      result.skipped.push(destPath);
    } else {
      if (!dryRun) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
        if (entry.endsWith('.sh')) fs.chmodSync(destPath, stat.mode | 0o111);
      }
      result.copied.push(destPath);
    }
  }
  return result;
}

function copyTemplate(src, dest, label, dryRun) {
  if (fs.existsSync(dest)) {
    log(`  skipped  ${label} (already exists)`);
    return false;
  }
  if (!dryRun) fs.copyFileSync(src, dest);
  log(`  copied → ${label}`);
  return true;
}

function writeIfAbsent(dest, content, label, dryRun) {
  if (fs.existsSync(dest)) {
    log(`  skipped  ${label} (already exists)`);
    return false;
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, 'utf8');
  }
  log(`  created → ${label}`);
  return true;
}

// ---------------------------------------------------------------------------
// --from <git-url>: clone to a temp dir and re-exec from there
// ---------------------------------------------------------------------------

function runFromGitUrl(url) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playbook-'));
  log(`\n  cloning ${url} …`);
  try {
    execSync(`git clone --depth 1 "${url}" "${tmpDir}"`, { stdio: 'inherit' });
  } catch (_) {
    log('\n  error: git clone failed. Check the URL and your network/SSH access.');
    process.exit(1);
  }
  const clonedBin = path.join(tmpDir, 'bin', 'playbook.js');
  if (!fs.existsSync(clonedBin)) {
    log('  error: cloned repo does not contain bin/playbook.js');
    process.exit(1);
  }
  // Re-exec without --from to avoid infinite loop
  const passThrough = args.filter((a, i) => a !== '--from' && args[i - 1] !== '--from');
  const result = spawnSync(process.execPath, [clonedBin, ...passThrough], { stdio: 'inherit' });
  process.exit(result.status ?? 0);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function printVersion() {
  log(`playbook v${PKG_VERSION}`);
}

function printHelp() {
  log(`
playbook — agentic project context installer

Usage:
  npx github:noeltock/playbook init [options]
  npx github:noeltock/playbook --version

Commands:
  init          Copy playbook/ and AGENTS.md/CLAUDE.md into the current project.
                Existing files are never overwritten — only new files are added.

Options:
  --from <url>  Clone from a git URL first, then init from the clone.
                Example: npx playbook init --from git@github.com:noeltock/playbook.git
  --dry-run     Show what would be copied without writing anything.
  --version     Print version and exit.
  --help, -h    Show this help.
`.trim());
}

async function runInit() {
  if (FLAG_FROM) {
    runFromGitUrl(FLAG_FROM);
    return; // unreachable; runFromGitUrl exits
  }

  const cwd = process.cwd();

  // Guard: don't init inside the playbook repo itself
  try {
    const cwdReal = fs.realpathSync(cwd);
    const pkgReal = fs.realpathSync(PKG_ROOT);
    if (cwdReal === pkgReal) {
      warn('You are inside the playbook source repo. Run this from your target project.');
      process.exit(1);
    }
  } catch (_) {}

  // Git repo check (advisory only)
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch (_) {
    warn('Current directory does not appear to be a git repo. Continuing anyway.');
  }

  if (FLAG_DRY_RUN) log('\n[dry-run] Files that would be written:\n');

  // AGENTS.md
  copyTemplate(
    path.join(SRC_TEMPLATES, 'AGENTS.md'),
    path.join(cwd, 'AGENTS.md'),
    'AGENTS.md',
    FLAG_DRY_RUN,
  );

  // CLAUDE.md (alias pointing to AGENTS.md content)
  copyTemplate(
    path.join(SRC_TEMPLATES, 'CLAUDE.md'),
    path.join(cwd, 'CLAUDE.md'),
    'CLAUDE.md',
    FLAG_DRY_RUN,
  );

  // playbook/ — file-by-file, never overwrites existing files
  const destPlaybook = path.join(cwd, 'playbook');
  const { copied, skipped } = copyIfAbsent(SRC_PLAYBOOK, destPlaybook, FLAG_DRY_RUN);
  if (copied.length)  log(`  copied → playbook/ (${copied.length} file${copied.length !== 1 ? 's' : ''})`);
  if (skipped.length) log(`  skipped  playbook/ (${skipped.length} existing file${skipped.length !== 1 ? 's' : ''} left untouched)`);

  // IDE stubs — only seeded when the IDE config dir already exists
  if (fs.existsSync(path.join(cwd, '.cursor', 'rules'))) {
    writeIfAbsent(
      path.join(cwd, '.cursor', 'rules', 'playbook.md'),
      'See AGENTS.md and playbook/ for project context.\n',
      '.cursor/rules/playbook.md',
      FLAG_DRY_RUN,
    );
  }
  if (fs.existsSync(path.join(cwd, '.windsurf', 'rules'))) {
    writeIfAbsent(
      path.join(cwd, '.windsurf', 'rules', 'playbook.md'),
      'See AGENTS.md and playbook/ for project context.\n',
      '.windsurf/rules/playbook.md',
      FLAG_DRY_RUN,
    );
  }
  if (fs.existsSync(path.join(cwd, '.agents'))) {
    const codexSkillDir = path.join(cwd, '.agents', 'skills', 'playbook');
    if (!FLAG_DRY_RUN) fs.mkdirSync(codexSkillDir, { recursive: true });
    copyTemplate(
      path.join(SRC_PLAYBOOK, 'skills', 'playbook-sync', 'SKILL.md'),
      path.join(codexSkillDir, 'SKILL.md'),
      '.agents/skills/playbook/SKILL.md',
      FLAG_DRY_RUN,
    );
  }

  if (FLAG_DRY_RUN) {
    log('\n[dry-run] No files were written.');
    return;
  }

  log(`
✓ playbook installed.

Next steps:
  1. Edit playbook/NORTH-STAR.md  — add your project's north star and goals.
  2. Edit playbook/playbook.yaml  — set id, north_star, owners.
  3. Edit playbook/TOOLS.md       — add project-specific tool doctrine.

Optional viewer:
  cd playbook/viewer && npm install && npm run dev
`);
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

(async function main() {
  if (FLAG_VERSION) { printVersion(); process.exit(0); }
  if (FLAG_HELP || !SUBCOMMAND) { printHelp(); process.exit(0); }
  if (SUBCOMMAND === 'init') { await runInit(); return; }

  log(`Unknown command: ${SUBCOMMAND}`);
  log('Run `npx github:noeltock/playbook --help` for usage.');
  process.exit(1);
})();

# /playbook

[![Validate](https://github.com/noeltock/playbook/actions/workflows/validate.yml/badge.svg)](https://github.com/noeltock/playbook/actions/workflows/validate.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

One folder. Every agent, same brain.

Drop `playbook/` into any repo where AI agents are doing meaningful work. From that moment, Claude, Codex, Cursor — any agent — knows the project's north star, tool doctrine, design rules, decisions already made, and errors already hit. It contributes from minute one without asking what the codebase is about.

---

## Install

**From GitHub (no npm publish required):**

```bash
npx github:noeltock/playbook init
```

**From a specific git URL (SSH or HTTPS):**

```bash
npx github:noeltock/playbook init --from git@github.com:noeltock/playbook.git
```

Both commands drop `playbook/` and a thin `AGENTS.md` routing stub into the current directory. Existing files are never overwritten — only new files are added. Detects and seeds `.cursor/rules`, `.windsurf/rules`, `.agents/skills/`, and `CLAUDE.md` automatically.

**Or as a submodule** (pin to a specific version):

```bash
git submodule add git@github.com:noeltock/playbook.git
```

---

## What you get

| File / Folder | Purpose |
|---|---|
| `AGENTS.md` | Root routing stub — the one file every agent reads first |
| `playbook/NORTH-STAR.md` | Why the project exists and what success looks like |
| `playbook/TOOLS.md` | Tool doctrine: what to use, what to avoid, and why |
| `playbook/DESIGN.md` | Product and UX rules (optional, owned by design) |
| `playbook/STYLEGUIDE.md` | Visual rules: colours, type, spacing, components |
| `playbook/tokens.json` | DTCG-compliant design tokens — machine-readable counterpart to STYLEGUIDE.md |
| `playbook/decisions.jsonl` | Append-only MADR-shaped ADR log |
| `playbook/DECISIONS.md` | Rendered view of decisions — regenerated, do not edit by hand |
| `playbook/errors.jsonl` | Append-only error/warning log with remedies and resolution state |
| `playbook/ERRORS.md` | Rendered view of errors — regenerated, do not edit by hand |
| `playbook/playbook.yaml` | Canonical config: id, north star summary, owners, provenance |
| `playbook/schemas/` | JSON Schemas for `playbook.yaml`, `decisions.jsonl`, `errors.jsonl` |
| `playbook/skills/` | Five SKILL.md slash commands, one per concern |
| `playbook/hooks/hooks.json` | Claude Code PostToolUse hook manifest |
| `playbook/viewer/` | Fumadocs docs site — sticky nav, content right |

---

## Skills

Five slash commands ship with the playbook. They work in Claude Code out of the box; Codex and Cursor users call them manually.

| Skill | When to use |
|---|---|
| `/playbook-decide` | Before or after a non-trivial architectural decision — writes a MADR record to `decisions.jsonl` |
| `/playbook-error` | When you hit a warning or error — records it with context, remedy, and resolution state in `errors.jsonl` |
| `/playbook-sync` | After meaningful diffs — detects drift between the repo and the playbook and offers to absorb it |
| `/playbook-render` | Regenerates `DECISIONS.md` and `ERRORS.md` from their JSONL sources |
| `/playbook-styleguide` | Creates or updates `STYLEGUIDE.md` and `tokens.json` from a codebase scan |

---

## Self-healing

Two triggers keep the playbook current automatically:

- **`/playbook-sync`** (agent-agnostic) — reads `provenance.git_commit` from `playbook.yaml`, diffs the repo since that commit, classifies drift by type (dependency changes, new directories, env vars, new API surface), and prompts you to absorb what matters.
- **PostToolUse hooks** (Claude Code only) — `detect-drift.sh` fires after `Bash`, `Write`, and `Edit` tool calls. When structural files (`package.json`, `.env.example`) are touched, it nudges the agent to run `/playbook-sync`. `rebuild-viewer.sh` rebuilds the viewer when `decisions.jsonl` or `errors.jsonl` are written, if viewer output is tracked by git.

Codex and Cursor get the skill; Claude Code gets both.

---

## Viewer

```bash
cd playbook/viewer && npm install && npm run dev
```

A Fumadocs docs site at `localhost:3000`. Sticky left nav, content right. Four MDX components render live from the source files: `<DecisionLog>`, `<ErrorLog>`, `<TokenGrid>`, `<PlaybookOverview>`.

---

## Standards

- [AGENTS.md](https://agents.md/) — Linux Foundation standard; the routing stub conforms to it
- [DTCG](https://www.designtokens.org/tr/drafts/format/) — W3C design token format for `tokens.json`
- [MADR](https://adr.github.io/) — ADR record shape for `decisions.jsonl`

---

## License

MIT © [Noel Tock](https://noeltock.com)

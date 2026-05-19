# /playbook

One folder. Every agent, same brain.

Drop `playbook/` into any agentic-coding project. From that moment, Claude, Codex, Cursor — any agent — knows the project's north star, tool doctrine, design rules, decisions already made, and errors already hit.

---

## Install

```bash
npx playbook init
```

Drops `playbook/` and a thin `AGENTS.md` routing stub into your repo. Detects and seeds `.cursor/rules`, `.windsurf/rules`, `.agents/skills/`, and `CLAUDE.md` automatically.

Or as a submodule:

```bash
git submodule add https://github.com/noeltock/playbook
```

---

## What you get

| File / Folder | What it does |
|---|---|
| `playbook/NORTH-STAR.md` | Why the project exists and what success looks like |
| `playbook/TOOLS.md` | Tool doctrine: what to use, what to avoid, and why |
| `playbook/DESIGN.md` | Product and UX rules (optional, seeded by `/design` skill) |
| `playbook/STYLEGUIDE.md` | Visual rules: colours, type, spacing, components |
| `playbook/tokens.json` | DTCG-compliant design token file |
| `playbook/decisions.jsonl` | Append-only MADR-shaped ADR log |
| `playbook/DECISIONS.md` | Auto-rendered view of decisions — do not edit by hand |
| `playbook/errors.jsonl` | Append-only error/warning log with remedies and resolution state |
| `playbook/ERRORS.md` | Auto-rendered view of errors — do not edit by hand |
| `playbook/playbook.yaml` | Playbook config: id, north star summary, provenance |
| `playbook/schemas/` | JSON Schemas for `playbook.yaml`, `decisions.jsonl`, `errors.jsonl` |
| `playbook/skills/` | Five SKILL.md files — slash commands for any agent |
| `playbook/hooks/` | PostToolUse hooks: drift detection + viewer rebuild |
| `playbook/hooks/hooks.json` | Hook manifest for Claude Code |
| `playbook/hooks/detect-drift.sh` | Nudges the agent when structural files change |
| `playbook/hooks/rebuild-viewer.sh` | Rebuilds viewer output when JSONL sources are written |
| `playbook/scripts/render.js` | Regenerates DECISIONS.md and ERRORS.md from JSONL |
| `playbook/scripts/validate.js` | Validates JSONL records against JSON Schemas |
| `playbook/viewer/` | Fumadocs docs site — sticky nav, content right |
| `templates/AGENTS.md` | Host-project routing stub (AGENTS.md standard) |
| `templates/CLAUDE.md` | Host-project Claude Code alias stub |

---

## Skills

| Skill | What it does |
|---|---|
| `/playbook-decide` | Records a non-trivial decision as a MADR entry in `decisions.jsonl`, then renders `DECISIONS.md` |
| `/playbook-error` | Records an error or warning in `errors.jsonl` with context, remedy, and resolution state |
| `/playbook-sync` | Diffs the repo against the playbook's last recorded commit, surfaces drift, and offers to absorb changes |
| `/playbook-render` | Pure-function regeneration of `DECISIONS.md` and `ERRORS.md` from their JSONL sources |
| `/playbook-styleguide` | Scans the codebase for visual primitives and generates or maintains `STYLEGUIDE.md` and `tokens.json` |

---

## Self-healing

Two triggers keep the playbook in sync automatically:

- **`/playbook-sync`** — run on demand, agent-agnostic. Reads `provenance.git_commit` from `playbook.yaml`, diffs the repo since that commit, classifies drift by type (dependency changes, new directories, env vars, API surface), and asks what to absorb.
- **PostToolUse hooks** (Claude Code) — `detect-drift.sh` fires after every `Bash`, `Write`, and `Edit` tool call. When structural files like `package.json` or `.env.example` are touched, it nudges the agent to run `/playbook-sync`. `rebuild-viewer.sh` fires after any `Write` that touches `decisions.jsonl` or `errors.jsonl`, triggering a viewer rebuild if output is tracked by git.

---

## Viewer

```bash
cd playbook/viewer
npm install
npm run dev
```

Opens a Fumadocs docs site at `localhost:3000`. Sticky left nav, content right. `<DecisionLog>`, `<ErrorLog>`, `<TokenGrid>`, and `<PlaybookOverview>` render from the live source files.

---

## Standards

- [AGENTS.md](https://agents.md/) — Linux Foundation standard; the routing stub conforms to it
- [DTCG](https://www.designtokens.org/tr/drafts/format/) — W3C design token format for `tokens.json`
- [MADR](https://adr.github.io/) — ADR record shape for `decisions.jsonl`

---

## License

MIT © Noel Tock

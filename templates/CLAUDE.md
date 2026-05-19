# Agent guide

This project uses `playbook/` as its source of truth for goals, rules, tools, and history.

## Always load on start

- `playbook/NORTH-STAR.md` — why this project exists and what success looks like
- `playbook/TOOLS.md` — how to use tools in this project

## Load when relevant

| Situation | Load |
|-----------|------|
| Touching UI, copy, or product flows | `playbook/DESIGN.md` |
| Touching anything visual (colours, type, components) | `playbook/STYLEGUIDE.md` |
| Making a decision that will be hard to reverse | `playbook/DECISIONS.md` |
| About to retry something that may have failed before | `playbook/ERRORS.md` |

## Recording decisions

When you make a non-trivial decision, call `/playbook-decide`. It appends a MADR record to `playbook/decisions.jsonl` and regenerates `playbook/DECISIONS.md`.

## Recording errors and warnings

When you hit a warning or error worth remembering, call `/playbook-error`. It appends to `playbook/errors.jsonl`. When the issue is resolved, mark it resolved and note whether the fix is permanent, a workaround, or likely to recur.

## Self-healing

Run `/playbook-sync` after significant changes. It diffs the repo against the playbook's last recorded state, surfaces drift, and asks which to absorb.

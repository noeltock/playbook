# /playbook — agent guide

You are working on the **playbook project itself** — an open-source tool that gets seeded into other repos.

## Structure

- `playbook/` — the folder that gets seeded into host projects. All templates live here.
- `templates/` — `AGENTS.md` and `CLAUDE.md` stubs that `npx playbook init` copies to the host project root.
- `schemas/` is inside `playbook/schemas/` — JSON Schemas for `playbook.yaml`, `decisions.jsonl`, `errors.jsonl`.
- `skills/` is inside `playbook/skills/` — five SKILL.md files.
- `hooks/` is inside `playbook/hooks/` — Claude Code hooks.

## Rules

- Never edit files inside `playbook/` as though they are live project files — they are templates.
- All text files must end with a final newline.
- No comments in YAML/JSON files.
- When modifying a SKILL.md, keep the frontmatter fields: `name`, `description`, `version`.
- When modifying `decisions.jsonl` or `errors.jsonl` records, validate against `playbook/schemas/`.

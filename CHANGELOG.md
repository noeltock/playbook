# Changelog

## 0.1.0 — 2026-05-19

Initial release.

### Added

- `playbook/` directory with all template files
- Five skills: `playbook-decide`, `playbook-error`, `playbook-sync`, `playbook-render`, `playbook-styleguide`
- JSON Schemas for `playbook.yaml`, `decisions.jsonl`, `errors.jsonl`
- PostToolUse hooks for Claude Code: drift detection + viewer rebuild
- Fumadocs viewer with custom theme, `<DecisionLog>`, `<ErrorLog>`, `<TokenGrid>`, `<PlaybookOverview>`
- `npx playbook init` CLI
- Claude Code, Codex, and Cursor plugin manifests
- CI workflow for schema validation and render freshness check
- `templates/` with AGENTS.md and CLAUDE.md host-root stubs

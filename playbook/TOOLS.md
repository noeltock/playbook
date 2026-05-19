# Tools

Rules for tool use in this project. Agents must follow these.

## Core principles

- **CLI > MCP** — when both a CLI and an MCP tool exist for the same operation, use the CLI. It's faster, cheaper, and more predictable.
- **Verify library docs via context7** — before writing code that calls a library or API, use `mcp__context7__resolve-library-id` then `mcp__context7__query-docs` to confirm the API is current. Your training data may be stale.
- **All web operations via `/web`** — never use WebFetch, WebSearch, or firecrawl tools directly. Route everything through the `/web` skill; it handles free vs paid routing automatically.
- **GitHub via `gh`** — all GitHub operations use the authenticated `gh` CLI. Never use the GitHub MCP tools for repo or PR operations.

## Command proxy

This project uses `rtk` as a token-optimising CLI proxy. Invoke all shell commands through it:

```bash
rtk git status        # instead of: git status
rtk npm test          # instead of: npm test
```

Run `rtk gain` to see token savings. Run `rtk discover` to find missed opportunities.

## Project-specific tools

<!-- Add project-specific entries here via /playbook-sync -->
<!-- Examples:
- WordPress projects: use `wp` (WP-CLI) for DB, user, and plugin operations
- macOS PDF work: use `qlmanage -t -s <size> -o <outdir> <file.pdf>` to render pages
- HEIC images: `sips -s format jpeg <input.heic> --out <output.jpg>`
-->

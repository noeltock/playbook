---
name: playbook-sync
description: Triggered explicitly by the user, or automatically when the agent detects significant structural changes — new top-level directories, dependency changes in package.json/composer.json/pyproject.toml, new env vars in .env.example, or new public API files. Diffs the repo against the playbook's last recorded commit and offers to absorb drift into the relevant playbook files.
version: 1.0.0
---

# playbook-sync

Self-heal the playbook. Compares the current repo state against the playbook's last recorded `provenance.git_commit`, surfaces drift, and offers to absorb changes into the relevant playbook files.

## When to use

- User explicitly runs `/playbook-sync`.
- Agent detects a hook nudge from `detect-drift.sh` (structural file changes).
- After a significant refactor, dependency upgrade, or onboarding of a new major module.
- Before a release, to ensure the playbook reflects what was actually built.

## Steps

### 1. Read provenance

Open `playbook/playbook.yaml` and read `provenance.git_commit` and `provenance.updated_at`.

If `provenance.git_commit` is absent or `null`:

- This is a first-time sync. Take a snapshot of the current HEAD commit.
- Write `provenance.git_commit` and `provenance.updated_at` to `playbook.yaml`.
- Inform the user: "No prior commit recorded — baseline set to current HEAD. Run `/playbook-sync` again after your next batch of changes to detect drift."
- Exit.

### 2. Run git diff

```bash
git diff <provenance.git_commit> HEAD --stat
git diff <provenance.git_commit> HEAD --name-only
```

If no diff output (repo is at the same commit), inform the user: "Playbook is already in sync with HEAD." and exit.

### 3. Classify drift

Group changed files into drift categories:

| Changed path pattern | Drift category | Likely affected playbook file |
|---|---|---|
| `package.json`, `composer.json`, `pyproject.toml`, `Gemfile` | **Dependency change** | `TOOLS.md` |
| `.env.example`, `.env.schema` | **New/removed env vars** | `TOOLS.md` |
| New top-level directory (e.g., `src/payments/`) | **Structural change** | `NORTH-STAR.md` or `playbook.yaml` |
| `tailwind.config.*`, `*.css` with custom properties, new component files | **Visual primitives** | `STYLEGUIDE.md` |
| `openapi.yaml`, `routes/`, `api/` | **API surface change** | `NORTH-STAR.md` |

Also scan commit messages since `provenance.git_commit` for decision-like language ("decided to", "chose", "we will use", "replaced X with Y") and surface those as potential `/playbook-decide` candidates.

### 4. Present drift summary

Show the user a grouped summary:

```
Drift detected since DEC-001 (2026-04-01):

[Dependency changes]
  - package.json: added react-query, removed swr

[New directories]
  - src/payments/ (3 new files)

[Env vars]
  - .env.example: added STRIPE_SECRET_KEY

[Possible decisions in commits]
  - "Replaced swr with react-query for better caching control"
```

### 5. For each drift item, ask what to do

For each drift category, offer the user these options:

- **Absorb into playbook** — update the indicated file (agent does it, user reviews).
- **Record as decision** — call `/playbook-decide` for this change.
- **Ignore** — skip for now (won't re-surface until next sync).

Act on the user's choices. For "absorb" items, make surgical edits to the target playbook file — add, update, or remove the relevant section rather than rewriting the whole file.

### 6. Update provenance

After all choices are resolved, update `playbook/playbook.yaml`:

```yaml
provenance:
  git_commit: <current HEAD SHA>
  updated_at: <current ISO 8601 datetime>
```

### 7. Trigger viewer rebuild (if applicable)

Run `${PLAYBOOK_ROOT}/hooks/rebuild-viewer.sh`.

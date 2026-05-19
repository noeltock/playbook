---
name: playbook-decide
description: Triggered when the user makes or has made a non-trivial decision — architecture, dependency choice, UX tradeoff, API contract, naming convention, or anything hard to undo. Records the decision as a MADR-shaped entry in decisions.jsonl and regenerates DECISIONS.md.
version: 1.0.0
---

# playbook-decide

Record a decision in the playbook. Appends a MADR-shaped JSON record to `decisions.jsonl` and regenerates `DECISIONS.md` via `/playbook-render`.

## When to use

Use this skill whenever the user makes or has made a decision that is:

- **Hard to undo** — architectural choices, API contracts, data model decisions.
- **A meaningful tradeoff** — choosing framework A over B, picking a naming convention, selecting a dependency.
- **Worth future agents knowing** — any context that would prevent a future agent from re-litigating the same question.

Do not use for trivial, easily-reversible choices (e.g., "I'll use double quotes").

## Steps

### 1. Gather decision details

Ask the user for the following (can be done in a single prompt):

- **Title** — a short, imperative phrase (e.g., "Use PostgreSQL for primary storage").
- **Context** — why was this decision needed? What problem or constraint drove it?
- **Decision** — what was chosen and why (key rationale, alternatives considered).
- **Consequences** — what does this imply going forward? What becomes easier or harder?

If you already have enough context from the conversation (the user just explained the decision), pre-fill what you know and confirm rather than asking from scratch.

### 2. Check for supersession

Read `decisions.jsonl` and list any existing decisions with related titles or keywords. Ask: "Does this supersede an existing decision?" If yes, record the id of the superseded decision in the `supersedes` field and update the superseded record's status to `"superseded"` by appending a new line for it.

### 3. Construct the JSON record

Build a record matching `playbook/schemas/decision.schema.json`:

```json
{
  "id": "DEC-NNN",
  "title": "...",
  "status": "accepted",
  "ts": "2026-05-19T00:00:00Z",
  "context": "...",
  "decision": "...",
  "consequences": "...",
  "supersedes": null
}
```

- `id`: Increment from the last `id` in `decisions.jsonl`. If the file is empty or absent, use `DEC-001`.
- `ts`: Current ISO 8601 datetime with UTC timezone.
- `status`: Always `"accepted"` for new decisions. Set to `"superseded"` only when updating an old record.
- `supersedes`: `null` unless this decision replaces a prior one.

### 4. Append to decisions.jsonl

Append the JSON record as a **single line** (no pretty-printing) to `decisions.jsonl` at the project root (or the path configured in `playbook/playbook.yaml` under `sources.decisions`).

If the file does not exist, create it.

### 5. Regenerate DECISIONS.md

Call `/playbook-render` to regenerate `DECISIONS.md` from the updated `decisions.jsonl`.

### 6. Trigger viewer rebuild (if applicable)

If `playbook/viewer/out/` or `playbook/viewer/dist/` exists and is tracked by git, run:

```bash
${PLAYBOOK_ROOT}/hooks/rebuild-viewer.sh
```

Otherwise the hook will handle it automatically via `hooks.json`.

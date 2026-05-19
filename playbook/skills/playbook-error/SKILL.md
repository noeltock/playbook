---
name: playbook-error
description: Triggered when the agent hits a warning or error worth remembering so future agents don't repeat the same mistake, or when a previously recorded error is now resolved. Records or updates entries in errors.jsonl and regenerates ERRORS.md.
version: 1.0.0
---

# playbook-error

Record an error or warning in the playbook. Appends a new record to `errors.jsonl` (or updates an existing one when resolved), then regenerates `ERRORS.md` via `/playbook-render`.

## When to use

Use this skill when:

- The agent encounters an error or warning during a task that is **non-obvious** or could recur.
- A workaround is found that future agents should know about.
- A previously recorded error has been permanently fixed or understood.
- A pattern of failure appears (e.g., a dependency that consistently conflicts, a platform quirk).

Do not use for trivial syntax errors or one-off typos that have no broader implication.

## Steps — recording a new error

### 1. Classify the record

Determine the `kind`:

- `"error"` — a hard failure that blocked progress.
- `"warning"` — a non-fatal issue that could silently cause problems.
- `"info"` — a gotcha or platform quirk worth noting but not strictly an error.

### 2. Capture the details

Collect or infer from context:

- **Summary** — one line describing the error (e.g., "npm ci fails when node_modules is a symlink").
- **Context** — when and where does this happen? Which command, environment, or code path triggers it?
- **Remedy** — what fixes or works around it. If unknown yet, set to `"unknown"`.

Ask: "Is this already resolved?" If yes, set `resolved: true` and ask for the resolution type.

### 3. Determine resolution status

| Value | Meaning |
|---|---|
| `"unresolved"` | Still happening, no fix known. |
| `"workaround"` | Mitigated but not root-fixed. |
| `"permanent"` | Root cause fixed; shouldn't recur. |
| `"recurrent"` | Happens occasionally; remedy is known but issue returns. |

### 4. Construct the JSON record

Build a record matching `playbook/schemas/error.schema.json`:

```json
{
  "id": "ERR-NNN",
  "kind": "error",
  "summary": "...",
  "context": "...",
  "remedy": "...",
  "resolved": false,
  "resolution": "unresolved",
  "resolved_ts": null,
  "ts": "2026-05-19T00:00:00Z"
}
```

- `id`: Increment from the last `ERR-NNN` in `errors.jsonl`. Use `ERR-001` if the file is empty or absent.
- `ts`: Current ISO 8601 datetime.
- `resolved_ts`: `null` unless the error is already resolved at time of recording.

### 5. Append to errors.jsonl

Append the record as a **single JSON line** to `errors.jsonl`. Create the file if absent.

### 6. Regenerate ERRORS.md

Call `/playbook-render`.

### 7. Trigger viewer rebuild (if applicable)

Run `${PLAYBOOK_ROOT}/hooks/rebuild-viewer.sh` if viewer output is tracked by git.

---

## Steps — marking an existing error as resolved

### 1. Find the record

Read `errors.jsonl` and locate the record by `id` or keyword match in `summary`. Present candidates if ambiguous.

### 2. Build an updated record

Copy the original record and update:

- `resolved`: `true`
- `resolution`: `"permanent"`, `"workaround"`, or `"recurrent"` — ask the user which applies.
- `resolved_ts`: Current ISO 8601 datetime.
- `remedy`: Update with the final resolution description if better than the original.

### 3. Append the updated record

Append the updated record as a new line in `errors.jsonl`. **Do not edit previous lines** — JSONL is append-only; the last record for a given `id` wins when rendering.

### 4. Regenerate ERRORS.md

Call `/playbook-render`.

#!/usr/bin/env bash
set -eo pipefail

# Ensure the hook always exits 0 so it never blocks agent tool use.
trap 'exit 0' EXIT ERR

# Structural files whose modification indicates potential playbook drift.
DRIFT_PATTERNS=(
  "package.json"
  "composer.json"
  "pyproject.toml"
  ".env.example"
)

# Read tool context from environment variables provided by Claude Code hooks.
TOOL_INPUT="${CLAUDE_TOOL_INPUT_COMMAND:-}"
TOOL_FILE="${CLAUDE_TOOL_INPUT_FILE_PATH:-}"

# Combine into a single string to search for drift patterns.
CONTEXT="${TOOL_INPUT} ${TOOL_FILE}"

MATCHED=0
for pattern in "${DRIFT_PATTERNS[@]}"; do
  if echo "${CONTEXT}" | grep -qF "${pattern}"; then
    MATCHED=1
    break
  fi
done

if [ "${MATCHED}" -eq 1 ]; then
  echo "[playbook] Structural change detected. Consider running /playbook-sync to keep the playbook in sync."
fi

exit 0

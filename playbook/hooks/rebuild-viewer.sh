#!/usr/bin/env bash
set -eo pipefail

# Ensure the hook always exits 0 so it never blocks agent tool use.
trap 'exit 0' EXIT ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIEWER_DIR="${SCRIPT_DIR}/../viewer"

# 1. Check if the viewer directory exists.
if [ ! -d "${VIEWER_DIR}" ]; then
  exit 0
fi

# 2. Check if a Next.js dev server is already running for the viewer.
#    If HMR is active, we don't need to trigger a build.
if pgrep -f "next dev" > /dev/null 2>&1 && \
   pgrep -f "playbook/viewer" > /dev/null 2>&1; then
  exit 0
fi

# 3. Check if the viewer's static output is tracked by git.
#    If tracked, run the build and stage the output.
VIEWER_OUT=""
if [ -d "${VIEWER_DIR}/out" ]; then
  VIEWER_OUT="${VIEWER_DIR}/out"
elif [ -d "${VIEWER_DIR}/dist" ]; then
  VIEWER_OUT="${VIEWER_DIR}/dist"
fi

if [ -n "${VIEWER_OUT}" ]; then
  # Resolve relative path for git ls-files
  VIEWER_OUT_REL="$(realpath --relative-to="$(git rev-parse --show-toplevel 2>/dev/null || pwd)" "${VIEWER_OUT}" 2>/dev/null || echo "")"
  if [ -n "${VIEWER_OUT_REL}" ] && git ls-files --error-unmatch "${VIEWER_OUT_REL}" > /dev/null 2>&1; then
    echo "[playbook] Building viewer..."
    npm --prefix "${VIEWER_DIR}" run build
    git add "${VIEWER_OUT}"
    exit 0
  fi
fi

# 4. Viewer exists but output is not tracked — print a reminder.
echo "[playbook] Viewer is stale. Run: npm --prefix playbook/viewer run build"

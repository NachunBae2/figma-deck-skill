#!/usr/bin/env bash
# what:  Run a Playwright-style JS file with `aside repl`, holding the same shared lock as figma-run.mjs (for Figma UI pages outside the editor, e.g. settings).
# usage: bin/aside-js.sh <file.js>      (for Plugin API work inside the editor use bin/figma-run.mjs instead)
# env:   ASIDE_LOCK (default /tmp/figma-deck-aside.lock), ASIDE_BIN (default aside)
R=$(cd "$(dirname "$0")/.." && pwd); ASIDE_BIN="${ASIDE_BIN:-aside}"; F="$1"
[ -f "$F" ] || { echo "usage: aside-js.sh <file.js>"; exit 2; }
OWNER="aside-js:$$"
node "$R/bin/aside-lock.mjs" take "$OWNER" || exit 1
trap 'node "$R/bin/aside-lock.mjs" drop "$OWNER"' EXIT
"$ASIDE_BIN" repl "$(cat "$F")"

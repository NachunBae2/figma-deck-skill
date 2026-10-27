#!/usr/bin/env bash
# what:  Offline self-check: syntax of bin/*.mjs (node --check), bin/*.sh (bash -n), scripts/*.js (parsed as async function bodies, the way figma-run.mjs runs them), and --help of the node CLIs.
# usage: bin/check.sh
# env:   none
R=$(cd "$(dirname "$0")/.." && pwd); FAIL=0
for f in "$R"/bin/*.mjs; do node --check "$f" || FAIL=1; done
for f in "$R"/bin/*.sh; do bash -n "$f" || FAIL=1; done
for f in "$R"/scripts/*.js; do
  node -e "const AF=Object.getPrototypeOf(async function(){}).constructor; new AF('figma','assets','args', require('fs').readFileSync(process.argv[1],'utf8'))" "$f" || { echo "parse error: $f"; FAIL=1; }
done
node "$R/bin/figma-api.mjs" --help >/dev/null || FAIL=1
node "$R/bin/figma-run.mjs" --help >/dev/null || FAIL=1
[ $FAIL = 0 ] && echo "check: ok" || { echo "check: FAILED"; exit 1; }

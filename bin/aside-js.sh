#!/usr/bin/env bash
# what:  Run a Playwright-style JS file with `aside repl`, holding the same shared lock as figma-run.mjs (for Figma UI pages outside the editor, e.g. settings).
# usage: bin/aside-js.sh <file.js>      (for Plugin API work inside the editor use bin/figma-run.mjs instead)
# env:   ASIDE_LOCK (default /tmp/figma-deck-aside.lock), ASIDE_BIN (default aside)
LOCK="${ASIDE_LOCK:-/tmp/figma-deck-aside.lock}"; ASIDE_BIN="${ASIDE_BIN:-aside}"; F="$1"
[ -f "$F" ] || { echo "usage: aside-js.sh <file.js>"; exit 2; }
export LOCK
for i in $(seq 1 120); do
  if [ -f "$LOCK" ] && ! node -e "const l=JSON.parse(require('fs').readFileSync(process.env.LOCK,'utf8'));const m=(Date.now()-Date.parse(l.at))/60000;process.exit(m<15&&l.holder!=='figma-deck'?3:0)"; then
    [ "$i" = 1 ] && echo "waiting for Aside lock: $(cat "$LOCK")" >&2; sleep 10
  else break; fi
done
echo '{"holder":"figma-deck","at":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}' > "$LOCK"
"$ASIDE_BIN" repl "$(cat "$F")"; RC=$?
node -e "try{const l=JSON.parse(require('fs').readFileSync(process.env.LOCK,'utf8'));if(l.holder==='figma-deck')require('fs').rmSync(process.env.LOCK)}catch{}"
exit $RC

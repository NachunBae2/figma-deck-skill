#!/usr/bin/env bash
# what:  Logic review (docs/method.md §3): give slide PNGs to a fresh Codex session without the authoring context, and collect findings only (6 questions + 2 chart questions).
# usage: bin/review-logic.sh <job> <fileKey> <slide-id,slide-id,...>     -> jobs/<job>/logic-review.md (the author adds accept/reject/hold)
# env:   CODEX_MODEL (optional; empty = Codex default), CODEX_EFFORT (default high), NO_EXPORT=1 (use the PNGs already in jobs/<job>/review-png/ instead of a REST export)
set -eo pipefail
R=$(cd "$(dirname "$0")/.." && pwd); JOB="$1"; KEY="$2"; IDS="$3"
[ -n "$JOB" ] && [ -n "$KEY" ] && [ -n "$IDS" ] || { echo "usage: review-logic.sh <job> <fileKey> <id,id,...>"; exit 2; }
[[ "$JOB" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "job name must be lowercase letters, digits and dashes: $JOB"; exit 2; }
command -v codex >/dev/null || { echo "codex CLI not found (https://github.com/openai/codex)"; exit 2; }
OUT="$R/jobs/$JOB"; PNG="$OUT/review-png"; mkdir -p "$PNG"
# Default: re-export so stale PNGs from earlier runs never reach the reviewer.
# NO_EXPORT=1: when the REST export is rate-limited, fill review-png/ yourself first:
#   node bin/figma-run.mjs scripts/export-png.js --arg ids=<ids> --json jobs/<job>/png.json > /dev/null && node bin/save-pngs.mjs jobs/<job>/png.json jobs/<job>/review-png
case "${NO_EXPORT:-}" in ""|0|1) ;; *) echo "NO_EXPORT must be 1 (or unset)"; exit 2;; esac
if [ "${NO_EXPORT:-}" != 1 ]; then
  rm -f "$PNG"/*.png
  node "$R/bin/figma-api.mjs" export "$KEY" "$IDS" --format png --scale 1 --out "$PNG" >/dev/null
fi
# The reviewer starts in an empty temp directory holding only the PNGs, so no plan, script or AGENTS.md is handed to it. (This is not a read sandbox.)
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
IMGS=(); for f in "$PNG"/*.png; do [ -f "$f" ] && cp "$f" "$WORK/" && IMGS+=(-i "$WORK/$(basename "$f")"); done
[ ${#IMGS[@]} -gt 0 ] || { echo "no PNGs in $PNG"; exit 1; }
MODEL_ARGS=(); [ -n "$CODEX_MODEL" ] && MODEL_ARGS=(-m "$CODEX_MODEL")
PROMPT="You are an independent reviewer seeing this deck for the first time. Assume you know nothing about its background, company or purpose. Review the attached slide images (file name order = slide order) one by one, using only the questions below. Point out problems only; do not fix them. Do not add facts by guessing.
1) Can you state the conclusion by reading only the title area?
2) Does the layout match the relationship, and does it answer the reader's question with 'yes'?
3) Are items placed side by side on the same level and of the same kind?
4) Can every split, colour and emphasis be justified in one sentence?
5) Does the figure prove the headline message?
6) Do numbers have a period, a denominator and a unit?
For slides with charts also:
7) Does the chart type match the relationship (share, hierarchy, flow, decomposition, concentration, two axes)?
8) Is the accent colour only where the headline points?
Output format (Markdown, in the language of the slides):
# Logic review — $JOB
## <slide number> <slide file name>
- One-line conclusion (what you understood from the title area alone; if you cannot, write 'unreadable' and why)
- Findings: question number (1-8) · where (title / left table / diagram ...) · the problem in one sentence · severity (high/medium/low)
(write 'no findings' if none)
## Overall
- Flow between slides (order, duplication, missing links)
- The three things to fix first
End with one line: 'Accept / reject / hold is recorded by the author.'"
rm -f "$OUT/logic-review.md"
RC=0
codex exec -C "$WORK" "${MODEL_ARGS[@]}" -c "model_reasoning_effort=\"${CODEX_EFFORT:-high}\"" -s read-only --skip-git-repo-check "${IMGS[@]}" -o "$OUT/logic-review.md" "$PROMPT" < /dev/null > "$OUT/logic-review.log" 2>&1 || RC=$?
if [ "$RC" = 0 ] && [ -s "$OUT/logic-review.md" ]; then echo "$OUT/logic-review.md"; cat "$OUT/logic-review.md"
else echo "no review output (codex exit $RC) — see $OUT/logic-review.log"; tail -20 "$OUT/logic-review.log"; exit 1; fi

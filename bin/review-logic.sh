#!/usr/bin/env bash
# what:  Logic review (docs/method.md §3): give slide PNGs to a Codex session with no context and collect findings only, against the 6 review questions.
# usage: bin/review-logic.sh <job> <fileKey> <slide-id,slide-id,...>     -> jobs/<job>/logic-review.md (the author adds accept/reject/hold)
# env:   CODEX_MODEL (optional; empty = Codex default), CODEX_EFFORT (default high), NO_EXPORT=1 (use PNGs already in jobs/<job>/review-png/ instead of REST export)
set -e
R=$(cd "$(dirname "$0")/.." && pwd); JOB="$1"; KEY="$2"; IDS="$3"
[ -n "$JOB" ] && [ -n "$KEY" ] && [ -n "$IDS" ] || { echo "usage: review-logic.sh <job> <fileKey> <id,id,...>"; exit 2; }
command -v codex >/dev/null || { echo "codex CLI not found (https://github.com/openai/codex)"; exit 2; }
OUT="$R/jobs/$JOB"; mkdir -p "$OUT/review-png"
# NO_EXPORT=1: when the REST image export is rate-limited (429), export PNGs with exportAsync via figma-run.mjs into review-png/ first.
[ -n "$NO_EXPORT" ] || node "$R/bin/figma-api.mjs" export "$KEY" "$IDS" --format png --scale 1 --out "$OUT/review-png" >/dev/null
IMGS=(); for f in "$OUT"/review-png/*.png; do [ -f "$f" ] && IMGS+=(-i "$f"); done
[ ${#IMGS[@]} -gt 0 ] || { echo "no PNGs in $OUT/review-png"; exit 1; }
MODEL_ARGS=(); [ -n "$CODEX_MODEL" ] && MODEL_ARGS=(-m "$CODEX_MODEL")
PROMPT="You are an independent reviewer seeing this deck for the first time. Assume you know nothing about its background, company or purpose. Review the attached slide images (file name order = slide order) one by one, using only the six questions below. Point out problems only; do not fix them. Do not add facts by guessing.
1) Can you state the conclusion by reading only the title area?
2) Does the layout match the relationship, and does it answer the reader's question with 'yes'?
3) Are items placed side by side on the same level and of the same kind?
4) Can every split, colour and emphasis be justified in one sentence?
5) Does the figure prove the headline message?
6) Do numbers have a period, a denominator and a unit?
Output format (Markdown, in the language of the slides):
# Logic review — $JOB
## <slide number> <slide file name>
- One-line conclusion (what you understood from the title area alone; if you cannot, write 'unreadable' and why)
- Findings: question number (1-6) · where (title / left table / diagram ...) · the problem in one sentence · severity (high/medium/low)
(write 'no findings' if none)
## Overall
- Flow between slides (order, duplication, missing links)
- The three things to fix first
End with one line: 'Accept / reject / hold is recorded by the author.'"
codex exec -C "$OUT" "${MODEL_ARGS[@]}" -c "model_reasoning_effort=\"${CODEX_EFFORT:-high}\"" -s read-only --skip-git-repo-check "${IMGS[@]}" -o "$OUT/logic-review.md" "$PROMPT" < /dev/null > "$OUT/logic-review.log" 2>&1 || true
if [ -s "$OUT/logic-review.md" ]; then echo "$OUT/logic-review.md"; cat "$OUT/logic-review.md"
else echo "no review output — see $OUT/logic-review.log"; tail -20 "$OUT/logic-review.log"; exit 1; fi

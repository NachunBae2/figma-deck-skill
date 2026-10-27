#!/usr/bin/env bash
# what:  Hand one deck job to Codex: it reads AGENTS.md, writes Plugin API scripts in scripts/<job>/, runs them with figma-run.mjs and reports in jobs/<job>/REPORT.md.
# usage: bin/codex-task.sh "<what to build, one paragraph>" [job-name]
# env:   FIGMA_FILE_KEY (required), CODEX_MODEL (optional; empty = Codex default), CODEX_EFFORT (default high), CODEX_SANDBOX (default danger-full-access)
set -e
R=$(cd "$(dirname "$0")/.." && pwd)
BRIEF="$1"; JOB="${2:-job-$(date +%Y%m%d-%H%M%S)}"
[ -n "$BRIEF" ] || { echo "usage: codex-task.sh \"<job description>\" [job-name]"; exit 2; }
[ -n "$FIGMA_FILE_KEY" ] || { echo "set FIGMA_FILE_KEY (the <key> in figma.com/design/<key>/...)"; exit 2; }
command -v codex >/dev/null || { echo "codex CLI not found (https://github.com/openai/codex) — the other tools work without it"; exit 2; }
mkdir -p "$R/jobs/$JOB" "$R/scripts/$JOB" "$R/exports/$JOB"
MODEL_ARGS=(); [ -n "$CODEX_MODEL" ] && MODEL_ARGS=(-m "$CODEX_MODEL")
EFFORT="${CODEX_EFFORT:-high}"
# figma-run.mjs drives the Aside browser and writes its lock/payload outside the repo, so a read-only or workspace-write sandbox cannot run it.
SANDBOX="${CODEX_SANDBOX:-danger-full-access}"
PROMPT="Read AGENTS.md first and follow it exactly. This job (job=$JOB):
$BRIEF

How to work:
1) Start from the newest cache/inventory-*.md to learn the existing pages and frame ids. If there is none, create it with: node bin/figma-api.mjs inventory $FIGMA_FILE_KEY
2) Before changing anything, read the source frames' text and structure with a read-only script in scripts/$JOB/ run through node bin/figma-run.mjs (do not guess).
3) Make copies named '$JOB NN · <title>' in empty space to the right of the source on the same page, and edit only the copies. Never edit, move or delete source frames. Do not put status words such as WIP or draft in names.
4) Use only numbers and facts given in the job description. Mark anything missing as '[needs check]' and list it in REPORT.md.
5) When done, write jobs/$JOB/REPORT.md in plain words: frames made (name, node id, link https://www.figma.com/design/$FIGMA_FILE_KEY/?node-id=<id with : replaced by ->), what changed, the needs-check list, and the export command.
Write in the language of the job description.
Never: send mail or post anything externally, edit files outside this repo, call aside directly, print secrets, change source frames."
cd "$R"
codex exec -C "$R" "${MODEL_ARGS[@]}" -c "model_reasoning_effort=\"$EFFORT\"" -s "$SANDBOX" -o "$R/jobs/$JOB/last.md" "$PROMPT" < /dev/null 2>&1 | tee "$R/jobs/$JOB/codex.log" | grep -v '^\s*$' | tail -40
echo "--- job=$JOB  report: $R/jobs/$JOB/REPORT.md"
[ -f "$R/jobs/$JOB/REPORT.md" ] && cat "$R/jobs/$JOB/REPORT.md" || echo "(no REPORT.md — see jobs/$JOB/last.md)"

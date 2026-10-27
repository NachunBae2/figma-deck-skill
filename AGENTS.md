# Agent rules (Codex, Claude Code and others)

Purpose: build slide decks inside a Figma file and export them as PNG/PDF. New slides are made by **cloning existing template frames in that file**, never from a blank page.

Configuration comes from the environment (see `.env.example`): `FIGMA_FILE_KEY` is the working file, `FIGMA_TOKEN` (or `FIGMA_KEYCHAIN_SERVICE`) the REST token.

## Method first
Follow `docs/method.md` (skill `deck-method`): goal & reader → one title sentence per slide (ghost deck) → relationship sketch (box sketch) in `jobs/<job>/PLAN.md`, agreed with a person before building. Title = conclusion sentence on one line, one line of evidence below. Theme colours only, native objects, inside the guides, body ≥ 10pt. After building, run the format check (`scripts/lint-format.js`) until 0 violations, and record the logic review findings (`bin/review-logic.sh`; without Codex, a person who did not make the deck answers the same questions) in `jobs/<job>/REPORT.md` as accepted / rejected / on hold.

## Tools (use only these)
- `node bin/figma-run.mjs <script.js> [--file <key>] [--node <id>] [--json <out>] [--asset name=path] [--arg k=v]` — runs `script.js` in the **Figma Plugin API context** (global `figma`) inside the editor via Aside. The script is an async function body and `return`s a JSON value. Must finish within 120 s. How to write scripts: `docs/plugin-api-tips.md`.
- `node bin/figma-api.mjs me | projects [teamId] | files <projectId> | file <key> [--depth N] | nodes <key> <ids> | inventory <key> | export <key> <ids> --format png|jpg|svg|pdf [--scale N] [--out dir]` — Figma REST, read-only. Use it for bulk PNG/PDF exports.
- `bin/deck-pdf.sh <pngs or pdfs...> -o out.pdf` — merge slides into one PDF.
- `node bin/figma-run.mjs scripts/lint-format.js --node <id> --arg frame=<id> --json jobs/<job>/lint.json` — format check. `--arg margin=0.05 --arg minpt=10` to tune.
- `node bin/figma-run.mjs scripts/scan-words.js --arg page="<page>" --arg words="a,b,c"` — banned-word scan for client decks.
- `bin/review-logic.sh <job> <key> <slide-id,...>` — logic review by a fresh Codex session without the authoring context → `jobs/<job>/logic-review.md`.
- `node bin/figma-run.mjs scripts/export-png.js --arg ids=<ids> --json jobs/<job>/png.json > /dev/null` + `node bin/save-pngs.mjs jobs/<job>/png.json <dir>` — PNGs from inside the editor when the REST export is rate-limited.
- `bin/check.sh` — offline syntax check of every tool and script.

## Never
- Print, log or commit secrets (tokens). Don't call `security find-generic-password` yourself; leave it to `bin/figma-api.mjs`.
- Call `aside repl` directly. Aside runs one call at a time and the shared lock (`$ASIDE_LOCK`) only works through `bin/figma-run.mjs` / `bin/aside-js.sh`.
- Delete, move or overwrite existing frames in Figma. Work only on copies named `<job> NN · title` (no status words such as "WIP" or "draft"). Deletion is done by a person in Figma.
- Send mail or post anything externally. Deliverables go to `exports/<job>/` (per-slide exports in `exports/<job>/slides/`, the merged `exports/<job>/deck.pdf`); working files to `jobs/<job>/`, `scripts/<job>/` and `cache/`; findings to `docs/errata.md`.
- Edit files outside this repository. The only writes outside it are the tools' own temporary files: the Aside lock `$ASIDE_LOCK`, payloads in `$ASIDE_PAYLOAD_DIR`, and system temp folders made by `deck-pdf.sh` and `review-logic.sh` (removed on exit).
- Invent numbers or promises. Use what the brief gives; mark the rest `[needs check]`.

## Conventions for contributors
- File, command and option names: English kebab-case (`fit-headline.js`, `--format`). Functions and variables inside JS and shell scripts: camelCase; environment variables, shell globals and module-level constants (`USAGE`, `ROOT`): UPPER_SNAKE_CASE. One responsibility per file.
- Job names: lowercase letters, digits and dashes (`my-deck`); the tools refuse others.
- Every file in `bin/` and `scripts/` starts with three header lines: `what:` / `usage:` / `env:`.
- Shell scripts are bash (`#!/usr/bin/env bash`), node CLIs are ESM `.mjs` for Node 20+.
- Shared scripts live in `scripts/`; per-job scripts go to `scripts/<job>/` (git-ignored).
- Run `bin/check.sh` before committing.

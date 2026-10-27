---
name: figma-deck
description: Build and edit slide decks (proposals, reports, one-pagers) directly in a Figma file — read, clone, fill and lint frames through the Figma Plugin API in the Aside browser, export PNG/PDF through the Figma REST API, and optionally delegate the build to Codex. Use for "make a deck/proposal/report in Figma", "update these Figma slides", "export the deck as PDF". Apply the deck-method skill first.
---

# figma-deck — Figma + Aside + Codex deck toolkit

**The method lives in the `deck-method` skill** (planning loop, slide format, format check, logic review). This skill is the toolkit that runs that method in Figma.

Toolkit location: the clone of this repository, referred to as `$FIGMA_DECK_HOME` (set it in your shell, e.g. `export FIGMA_DECK_HOME=~/src/figma-deck-skill`). Run every command from there. Rules for agents: `$FIGMA_DECK_HOME/AGENTS.md`.

## How it works
- The Figma **web editor exposes the Plugin API global `figma`** to page scripts. `bin/figma-run.mjs` opens the file in the Aside browser and runs your script there, so reading, cloning, editing text, replacing images and `exportAsync` all work without installing a Figma plugin or MCP server.
- The REST token (`FIGMA_TOKEN`, read scopes) is for **listing and exporting** only. All writes go through the Plugin API.
- Aside allows one call at a time. figma-run.mjs and aside-js.sh share a lock file (`$ASIDE_LOCK`) and wait for each other (up to 20 min). Keep runs short.

## Tools
| command | purpose |
|---|---|
| `node bin/figma-run.mjs <script.js> [--file key] [--node id] [--json out] [--asset name=png] [--arg k=v]` | Run a Plugin API script (async body, `return` value) in the editor. Default file `$FIGMA_FILE_KEY`. |
| `node bin/figma-api.mjs inventory <key>` · `export <key> <id,id> --format pdf\|png [--scale N] [--out dir]` · `me`, `file <key>`, `nodes <key> <ids>` … (`--help`) | REST reads, inventory, exports. |
| `bin/deck-pdf.sh <pdf/png...> -o out.pdf` | Merge exported slides into one PDF. |
| `bin/codex-task.sh "<job>" [job-name]` | Delegate one build to Codex → `jobs/<job>/REPORT.md`. Optional. |
| `node bin/figma-run.mjs scripts/lint-format.js --arg frame=<id>` | Format check (machine). |
| `bin/review-logic.sh <job> <key> <ids>` | Logic review by a fresh Codex session without the authoring context (findings only). The review itself is required; Codex is optional — without it, a person who did not make the deck answers the same questions. |
| `scripts/inventory.js`, `scripts/fit-headline.js`, `scripts/scan-words.js`, `scripts/strip-name-tag.js` | Inventory, one-line headlines, banned-word scan, remove status tags from a job's copy names. |
| `scripts/export-png.js` + `node bin/save-pngs.mjs <json> <dir>` | PNG export inside the editor when the REST export is rate-limited (429). |
| `bin/aside-js.sh <file.js>` | Plain `aside repl` with the shared lock, for Figma pages outside the editor. |

## One deck, end to end
1. **Plan first** (deck-method): write `jobs/<job>/PLAN.md` — goal and reader, one title sentence per slide, one-line relationship sketch per slide — and get it agreed by the requester. No drawing before the list of titles.
2. **Inventory**: `node bin/figma-api.mjs inventory $FIGMA_FILE_KEY` (or `scripts/inventory.js` without a token) to find the template frames and their ids.
3. **Read** the source frames with a read-only script; **clone** them to the right of the source as `<job> NN · title`; **fill** only the copies. Never edit, move or delete source frames; deletion is done by a person in Figma.
4. **Check**: `scripts/lint-format.js` until 0 violations; `scripts/scan-words.js` for client decks; logic review (`bin/review-logic.sh`, or a person who did not make the deck) and record accept / reject / hold in REPORT.md; add findings to `docs/errata.md`.
5. **Export** into a fresh folder: `rm -rf exports/<job>/slides && node bin/figma-api.mjs export $FIGMA_FILE_KEY <ids> --format pdf --out exports/<job>/slides` → `bin/deck-pdf.sh exports/<job>/slides/*.pdf -o exports/<job>/deck.pdf`.

## Cautions
- Load before editing: `page.loadAsync()`, `figma.loadFontAsync(fontName)`. Pass images with `--asset`, never inline base64.
- Scripts that write must wait 8–15 s at the end, or the last edits/images may not be saved (see `docs/plugin-api-tips.md`).
- Numbers and promises come only from the brief; unknowns stay `[needs check]`.
- Never print or commit the token. Never send mail or post anything from a job.

---
name: deck-method
description: Method for making slide decks (proposals, reports, presentations) — the planning loop (meeting room → goal & reader → think box → ghost deck → box sketch → build → review), the format of one slide (conclusion title + one-line evidence, left row labels, one accent column, theme colours, native objects, ≥10pt), chart choice (pie, donut, funnel, waffle, treemap, sunburst, waterfall, Pareto, Marimekko), and the two reviews (machine format check, independent logic review). Apply first whenever you build or review a deck; the Figma tooling is the figma-deck skill.
---

# deck-method — how decks are made

Full text with rationale: `docs/method.md` (English) and `docs/method.ko.md` (Korean original) in this repository (`$FIGMA_DECK_HOME`). This page is the working checklist.

## 1. Plan before you draw
Loop: **meeting room** (match the org template; else the team default) → **goal & reader** (presented vs. read deck; define new terms) → **think box** (notes by author; *how* vs. *what* apart) → **ghost deck** (one title sentence per slide; readable from titles alone; name things; numbers with basis) → **box sketch** (places, roles, relationships only) → **build** (native objects, theme colours, inside guides; refine sentences before shrinking type) → **review** (done / possible / expected / verified kept apart; log mistakes). After review, loop again from the think box.

Write stages 1–5 as Markdown in `jobs/<job>/PLAN.md` and agree on it before building. If the requester gives a numbered slide list, keep it 1:1 — extra slides are only a "proposal" line in PLAN.

## 2. One slide
- Title = the conclusion as a sentence, **one line**, running to the right edge of the body (≈40–52px on 1920px; lengthen the sentence if short). One line of evidence below in grey.
- Left row-label column (grey, bold) + content columns. One emphasised column in the accent colour (white text); others light grey.
- ☐ checklists for checks; small boxes with arrows for flows; dashed "Proposal" tag for anything undecided.
- Theme colours only; one accent; no white on orange; no full-image slides or pasted tables; min 10pt (20px on 1920, 10px on A4 595); nothing outside the guides; numbers with period, denominator, unit.
- Use the template of the deck type; plain copy names `<job> NN · title` (no "WIP"/"draft").
- Client decks: no internal system/tool/model names, processes, sources or jargon; titles say what the client gives and gets; deliverables, promises and numbers only as given (`[needs check]` otherwise); other clients' material only anonymised.

## 3. Charts
Decide the relationship in the box sketch, then pick: share → pie (2–4 items) / donut (+ total) / waffle (100 cells), 5+ items → bars · hierarchy → treemap / sunburst · stages → funnel · cause of change → waterfall · concentration → Pareto · two-axis mix → Marimekko · trend → line · item comparison → sorted horizontal bars. One accent where the headline points; values on the data; "what · unit" line under the chart title; one-line takeaway; native objects; label sample data.

## 4. Review
- **Format check (machine)** — `node bin/figma-run.mjs scripts/lint-format.js --arg frame=<id>` until 0: ☐ outside guides ☐ under 10pt ☐ hard-coded HEX ☐ white on orange ☐ full-image slide / non-native table ☐ overlap / overflow (also look at rendered thumbnails). Client decks: `scripts/scan-words.js`.
- **Logic review (independent, findings only)** — `bin/review-logic.sh <job> <key> <ids>`: ☐ conclusion from title alone? ☐ layout matches relationship, answers the reader's question? ☐ side-by-side items same level and kind? ☐ every split/colour/emphasis justified in one sentence? ☐ figure proves the headline? ☐ numbers have period, denominator, unit? ☐ chart type fits the relationship? ☐ accent only where the headline points?
- Record each finding as accepted / rejected / on hold with the reason; add it to `docs/errata.md` with "machine-checkable?".
- Passing both checks ≠ readable: the ghost deck has a "what will the reader decide?" column.

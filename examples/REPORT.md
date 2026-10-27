# REPORT — sample-proposal (fictional data)

> Sample only. Frame ids and links are placeholders.

## Frames made
| # | Name | Node id | Link |
|---|---|---|---|
| 01 | sample-proposal 01 · Pilot summary | 101:2 | https://www.figma.com/design/<FIGMA_FILE_KEY>/?node-id=101-2 |
| 02 | sample-proposal 02 · Demand by product | 101:40 | https://www.figma.com/design/<FIGMA_FILE_KEY>/?node-id=101-40 |
| 03 | sample-proposal 03 · Measured funnel | 101:77 | https://www.figma.com/design/<FIGMA_FILE_KEY>/?node-id=101-77 |
| 04 | sample-proposal 04 · Inputs and deliverables | 101:120 | https://www.figma.com/design/<FIGMA_FILE_KEY>/?node-id=101-120 |
| 05 | sample-proposal 05 · Client A case | 101:161 | https://www.figma.com/design/<FIGMA_FILE_KEY>/?node-id=101-161 |
| 06 | sample-proposal 06 · Start date | 101:190 | https://www.figma.com/design/<FIGMA_FILE_KEY>/?node-id=101-190 |

Source template frames were cloned; no source frame was edited, moved or deleted.

## What changed
- Titles and evidence lines from PLAN.md, one line each (`scripts/fit-headline.js`, 44–52px).
- 02 and 03 are native Figma charts built from the numbers in the brief.

## Needs check
- 02: search volume ratio "4×" — no source in the brief yet.

## Checks
- Format check (`scripts/lint-format.js`): 3 → 0 violations (two texts under 10pt on 04, one hard-coded HEX fill on 05).
- Banned words (`scripts/scan-words.js`): 0 hits.
- Logic review (`bin/review-logic.sh`): 4 findings.

| # | Finding | Handling | Reason |
|---|---|---|---|
| 1 | 02 title claims "4×" but the chart has no period | Accepted | Added "last 12 months" under the chart title |
| 2 | 03 funnel stages use different units | Accepted | All stages now count companies |
| 3 | 05 single case may not prove the target | On hold | Waiting for a second anonymous case |
| 4 | 06 date tag looks final | Rejected | It already carries the dashed "Proposal" tag |

## Export
```
rm -rf exports/sample-proposal/slides
node bin/figma-api.mjs export $FIGMA_FILE_KEY 101:2,101:40,101:77,101:120,101:161,101:190 --format pdf --out exports/sample-proposal/slides
bin/deck-pdf.sh exports/sample-proposal/slides/*.pdf -o exports/sample-proposal/deck.pdf
```

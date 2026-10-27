# Deck method

> Translation of [method.ko.md](method.ko.md) (Korean original). If the two differ, the Korean original wins.

Every deck follows **this order and this format**. The tool (Figma, PPTX) may change; the method does not.

## 1. The planning loop — principles and outputs per stage
Set up the "meeting room" and agree on goal and reader, then run the loop from think box to review. After a review, **go round again starting from the think box**.

| Stage | Principle | Output |
|---|---|---|
| Meeting room (setup) | If the organisation has a template, analyse it first and match layout, colours, fonts and type sizes. If not, use your team's default Figma slide template | A working PPTX (or Figma working frame) with the format ready |
| Goal & reader | Separate decks to be presented from decks to be read. Define any term not yet agreed at the start | Agreed purpose, reader, key message and total length |
| Think box | Notes are colour-coded by author. Keep *how to build it* (highlighter stickers) apart from *content* (grey memos) | Notes and memos on the board |
| Ghost deck | Write titles so the deck is understood from the title areas alone. Report style, call things by name, give every number its basis | One title sentence per slide |
| Box sketch | No sentences — only places, roles and relationships. Choose in this order: relationship → layout to try first → how to express the strategy | Layout sketch of the relationships |
| Build | Native objects, theme colours, inside the guides. Refine the sentence before shrinking the type | Finished slides |
| Review | Keep *done*, *possible*, *expected* and *verified* apart. Collect every mistake you were called on | Revised deck, errata log |

In practice: when a deck is requested, write stages 1–5 **as text (Markdown) first** and agree on them with the requester — one line for goal and reader, the list of title sentences, one line of relationship sketch per slide. Only then start building. Never draw without the list of title sentences. Keep this text in `jobs/<job>/PLAN.md` (sample: [examples/PLAN.md](../examples/PLAN.md)).

## 2. Format of one slide
- **Title = the conclusion as a sentence** (no noun lists), with **one line of evidence/explanation** right below (report style, 10–11pt grey).
- **The title is one line** and runs to the right edge of the body area. Fit the font size to the width (about 40–52px on a 1920px frame); if it is still short at the largest size, lengthen the sentence. Never force a second line with a line break (`scripts/fit-headline.js`).
- Body: a **left row-label column** (grey background, bold: checker / target / items / handling, or principle / output) plus content columns on the right. In comparisons every column has a header band; **only the one column to emphasise gets the strong accent** (default example: dark teal-blue #2E5C7A, white text); the rest get light grey (#E6E6E6) headers and #F2F2F2 cells.
- Checks are ☐ checklists. Flows are small boxes (thumbnail → step → result) with arrows; a loop back is a bracket line underneath with a note.
- Anything not yet decided gets a dashed **"Proposal"** tag.
- Theme colours only (black, grey steps, one accent). No white text on orange (accent2). No full-image slides and no tables pasted as images — use native objects.
- Minimum type size 10pt (20px on a 16:9 1920px frame, 10px on an A4 595px frame). No body objects outside the margin guides.
- Numbers carry period, denominator and unit; people and companies are called by name.

## 3. Review — format check and logic review
Format rules are measured by a machine; logic is questioned by an independent reviewer who does not know how the deck was made. Passing the format check does not prove that the layout matches the relationship — check that separately.

| | Format check | Logic review |
|---|---|---|
| Checker | Machine — scripts and renders measure it | Independent reviewer — a person (or session) without the authoring context asks |
| Target | Violations of format rules: guides, type size, colour, fonts, editability | Logic of the content: title areas, layout vs. relationship, evidence |
| Items | ☐ body objects outside the strict guides ☐ body text under 10pt ☐ body objects painted with hard-coded HEX ☐ white text on orange (accent2) ☐ full-image slides, non-native tables ☐ overlap / overflow — confirm on rendered thumbnails | ☐ Can you state the conclusion from the title area alone? ☐ Does the layout match the relationship, and does it answer the reader's question with "yes"? ☐ Are side-by-side items on the same level and of the same kind? ☐ Can each split, colour and emphasis be justified in one sentence? ☐ Does the figure prove the headline? ☐ Do numbers have period, denominator and unit? |
| Handling | Record each new format rule together with whether it can become a machine check | The reviewer only points out and never fixes. Each finding is recorded as accepted / rejected / on hold, with the reason |

## 4. Running it with this repo
- Format check: `node bin/figma-run.mjs scripts/lint-format.js --node <frame-id> --arg frame=<frame-id>` → violations per slide. Look at rendered thumbnails as well: `node bin/figma-api.mjs export … --format png --scale 0.5`.
- Logic review: `bin/review-logic.sh <job> <key> <slide-id,…>` → the slide PNGs go to a **Codex session with no context**, which answers only the six questions → `jobs/<job>/logic-review.md`. The author records accept / reject / hold.
- Banned words: before exporting a client-facing deck, run `scripts/scan-words.js` over all text and frame names on the page.
- Errata: add every finding to `docs/errata.md`, one row each: "deck · finding · handling · new rule (machine-checkable?)".
- Keep the planning outputs (goal & reader, title sentences, relationship sketch) in `jobs/<job>/PLAN.md`. Delegate the build (`bin/codex-task.sh`) only after PLAN.md is agreed.

## 5. Charts — pick the type that fits the relationship, emphasise one thing
Don't stop at "draw it intuitively": **decide the relationship in the box-sketch stage, then pick the chart from this table**. Don't repeat bars and lines for everything.

| # | Chart | When (relationship) | How | Level |
|---|---|---|---|---|
| 01 | Pie | Share of a whole, **2–4 items only** | Accent on the biggest slice, % inside slices | Basic |
| 02 | Donut | Share + **one total** | Total in the centre (big number + unit), items and % table on the right | Basic |
| 03 | Funnel | **Drop-off** by stage | Stage names and counts on the left, "% of previous stage" on the right, accent only on the biggest drop | Basic |
| 04 | Waffle | A ratio made tangible as **100 cells** (people, customers) | 10×10 grid, big % + note + the remainder beside it | Intermediate |
| 05 | Treemap | **Shares within a hierarchy** (category → items) | Group labels on top, name and % in cells, accent only on the largest cell | Intermediate |
| 06 | Sunburst | Hierarchical shares **as rings** (channel → campaign) | Inner ring = parent, outer ring = child, colour only the branch to emphasise | Intermediate |
| 07 | Waterfall | **Decomposing a change** from start to end (Sep → Oct revenue) | Start and end bars dark, increases and decreases in different tones, +/− values on bars, dotted connectors | Intermediate |
| 08 | Pareto | **How few items make up most** (top 20% → 80%) | Bars in descending order + cumulative line + dotted 80% line, mark where it passes 80% | Intermediate |
| 09 | Marimekko | **Two shares at once** (width = channel share, height = device mix) | Name and width % under each column, % inside cells | Advanced |

Order of choice: shares → 01, 02, 04 (5+ items → bars); hierarchy → 05, 06; stages/flow → 03; cause of change → 07; concentration → 08; two-axis mix → 09. Trends over time default to lines; comparisons between items default to horizontal bars sorted by length.

Format of one chart:
- One line under the chart title saying **what and in which unit** ("Sep → Oct revenue (k USD)", "out of 100 customers"); legend as small squares top right.
- **One accent colour**; everything else black and grey steps. Emphasise only the one cell or bar the headline points to.
- Write values on the data (don't make readers read the axis). Light gridlines; axis from 0 to max only.
- Under the chart (or in the slide title) add **one line saying what the chart shows** ("Top 20% = 80%?", "Drop-off by stage").
- Charts are native objects too (Figma vectors, PPTX charts), never pictures. Label sample data as "sample data".
- Extra logic-review questions: ☐ Does the chart type match the relationship (share, hierarchy, flow, decomposition, concentration, two axes)? ☐ Is the accent only where the headline points?

## 6. Rules learned in practice
- **Use the flow you were given.** If the requester gives a numbered slide list, keep its numbers, order and length 1:1. Do not add chapter covers, agendas or closing slides to pad it. Extra slides go into PLAN as a "proposal" only.
- **Keep to the template.** New decks are not improvised from a blank page. Find out the deck type (proposal, report, lecture …) and copy that type's template. If unsure, ask for a reference deck.
- **No status words in names.** Call copies by plain names such as `<job> NN · title`. Words like "WIP" or "draft" do not go into page or frame names, nor into reports (clean up with `scripts/strip-name-tag.js`).
- **No internal story in client decks.** Internal system names, internal processes, the source of your method, tool or model names, verification steps and jargon/acronyms stay out of titles, body, footnotes and frame names. Title each slide by "what the client gives and what they get", and name what they get as a concrete deliverable. Spell out acronyms in plain words. Run the banned-word scan before exporting.
- **Only promises and numbers you were given.** Deliverables, commitments and numbers come from the requester only — don't invent them to sound concrete. Mark missing numbers as `[needs check]`.
- **Passing both checks ≠ readable.** Add a "what will the reader decide from this slide?" column to the ghost deck. A slide that only collects material (screenshots, other documents) gives the reader nothing to decide on.
- **Never reuse another client's material or prices.** Cases are anonymous (Client A, B) with numbers only.
- **Cross-check "only" and "unique" claims.** If a title says "only X leaves a number", check the other columns of the table. In flow comparisons every row must end in the same final box wording.
- **Recompute prices and ratios.** Check phrases like "list price A … (−N%)" by calculation.
- **When reusing a figure, compare its labels with the body labels.**

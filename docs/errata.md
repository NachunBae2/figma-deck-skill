# Errata log

Every finding from a review (format check, logic review, or the requester) gets one row. Over time this becomes your own rule book; promote rules that a machine can check into `scripts/lint-format.js`. See [method.md §3](method.md#3-review--format-check-and-logic-review).

| Date | Deck (job · frame) | Finding | Handling (accepted / rejected / on hold) | New rule / machine-checkable? |
|---|---|---|---|---|
| YYYY-MM-DD | sample-job · 05 | Example: flow rows end in different final boxes ("secured" / "proposed" / "inquiry") | Accepted → all rows end in "buyer meeting" | Flow rows must end with the same wording (machine-checkable: compare the last box text per row) |

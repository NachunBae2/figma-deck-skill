# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `no result in Aside output` / `figma editor not ready in 60s` | Aside not logged in to Figma, slow load, or the file key is wrong | Open the file once in Aside and log in; raise `--wait 120`; check `FIGMA_FILE_KEY` |
| `waiting for Aside lock: …` and nothing happens | Another run holds the shared lock (one Aside call at a time) | Wait (up to 20 min); a lock older than 15 min is ignored. Delete `$ASIDE_LOCK` only if you are sure no run is active |
| Last edit or new image missing after a run | The tab closed before Figma saved | End write scripts with a 8–15 s wait (see plugin-api-tips.md) and re-read in a second run |
| `RangeError: Maximum call stack size exceeded` with big inputs | Large base64 passed inline | Use `--asset name=path` (figma-run.mjs writes a payload file the repl reads) |
| `figma 403 /teams/<id>/projects` | The token lacks the `projects:read` scope | Re-issue the token with that scope, or take the file key from the file URL (`/design/<key>/`) |
| `figma 429` on export | REST rate limit | figma-api.mjs retries after 15 s; for reviews export PNGs with `exportAsync` through figma-run.mjs and run `NO_EXPORT=1 bin/review-logic.sh …` |
| `no Figma token` | Neither `FIGMA_TOKEN` nor `FIGMA_KEYCHAIN_SERVICE` set | See README → Setup |
| `codex CLI not found` | Codex is optional | Install Codex for `codex-task.sh` / `review-logic.sh`; all other tools work without it |
| Script error `Unexpected token` | Scripts are function bodies, not modules | No `import`/`export`; use `bin/check.sh` to parse them offline |

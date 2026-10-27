# figma-deck-skill

Make slide decks in Figma with Claude Code: Aside browser + Figma Plugin API + Codex review.

[한국어 README](README.ko.md)

## What and why
- **Decks stay in Figma.** Slides are built by cloning your existing template frames inside a Figma file, so your fonts, colours and layout are kept and people can keep editing the result.
- **No plugin, no MCP server.** The Figma web editor exposes the Plugin API object `figma` to page scripts. `bin/figma-run.mjs` opens the file in the [Aside](#requirements) browser and runs a small script there — read, clone, edit text, swap images, export.
- **A method, not just tools.** Two Claude Code skills: `deck-method` (plan titles before drawing, one conclusion per slide, chart choice, two kinds of review) and `figma-deck` (how to drive the tools).
- **Two reviews.** A machine format check (`scripts/lint-format.js`: margins, <10pt text, off-theme colours, overlaps …) and an independent logic review (`bin/review-logic.sh` asks a fresh Codex session without the authoring context; without Codex, ask a person who did not make the deck).

## Requirements
| | needed for | notes |
|---|---|---|
| Node.js 20+ | everything | uses built-in `fetch` |
| A Figma account that can edit the working file | editing | the file must already contain your template frames |
| Figma personal access token | REST: inventory, export | read scopes are enough |
| **Aside browser** with the `aside` CLI on `PATH` | **all editing** (`figma-run.mjs`, `aside-js.sh`) | see *About Aside* below; Aside must be logged in to Figma |
| poppler (`pdfunite`, `pdfinfo`) | `deck-pdf.sh` | `brew install poppler`; image→PDF uses `sips` (macOS) or ImageMagick |
| [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) | optional: using the skills | install and log in per its docs; the tools also run by hand |
| [Codex CLI](https://github.com/openai/codex) | optional: `codex-task.sh`, `review-logic.sh` | install and log in (`codex login`); everything else works without it |

**About Aside.** Aside is a third-party, Chromium-based AI browser for macOS whose `aside` CLI includes `aside repl`, a Playwright-style JavaScript REPL. Install the desktop app and its CLI following the vendor's instructions, open the app, then check:
```sh
aside --version && aside repl --help
```
The first real browser call is step 2 of the quickstart below (it goes through the shared lock). This toolkit only uses `aside repl` (`openTab`, `page.evaluate`, and `fs.readFile` of files under `~/.aside/u/<account>/`). If your Aside account is not `u0`, set `ASIDE_PAYLOAD_DIR` (see `.env.example`).

**Without Aside** you can still use the REST side — `figma-api.mjs` (inventory, node dumps, PNG/PDF export) and `deck-pdf.sh` — but you cannot edit slides, and `lint-format.js`/other scripts cannot run.

## Setup
1. Clone this repository and check it:
   ```sh
   git clone <this-repo-url> figma-deck-skill
   cd figma-deck-skill
   bin/check.sh
   ```
2. Create a Figma token: Figma → Settings → Security → **Personal access tokens** → *Generate new token*. Give it read scopes (`file_content:read`, `file_metadata:read`, `current_user:read`; add `projects:read` if you want `figma-api.mjs projects` / `files`). It looks like `figd_xxxx`.
3. Configure:
   ```sh
   cp .env.example .env      # fill in FIGMA_TOKEN and FIGMA_FILE_KEY
   set -a; . ./.env; set +a
   node bin/figma-api.mjs me # prints your Figma user → token works
   ```
   `FIGMA_FILE_KEY` is the `<key>` in `https://www.figma.com/design/<key>/...`. On macOS you can keep the token in the keychain instead: `security add-generic-password -s figma-deck-token -a "$USER" -w` (it prompts for the token), then set `FIGMA_KEYCHAIN_SERVICE=figma-deck-token`.
4. Open the file once in Aside and log in to Figma there.
5. Install the skills for Claude Code (symlinks keep them up to date):
   ```sh
   mkdir -p ~/.claude/skills
   ln -s "$PWD/skills/figma-deck" ~/.claude/skills/figma-deck
   ln -s "$PWD/skills/deck-method" ~/.claude/skills/deck-method
   export FIGMA_DECK_HOME="$PWD"                                  # the skills refer to the repo as $FIGMA_DECK_HOME
   printf 'export FIGMA_DECK_HOME=%q\n' "$PWD" >> ~/.zshrc         # keep it for new shells (or your shell's profile)
   ```

## Your first deck in 5 minutes
```sh
# 1. See what is in the file (pages, frames, ids) -> cache/inventory-<key>-<date>.md
node bin/figma-api.mjs inventory $FIGMA_FILE_KEY

# 2. Check that the editor bridge works (read-only)
node bin/figma-run.mjs scripts/inventory.js --json cache/inventory.json

# 3. Plan: write jobs/my-deck/PLAN.md (goal & reader, one title sentence per slide, layout sketch)
mkdir -p jobs/my-deck && cp examples/PLAN.md jobs/my-deck/PLAN.md   # then edit it
#    Get the plan agreed by the person who asked for the deck before building, and note it in PLAN.md ("Agreed: <who>, <date>").

# 4. Build: let Codex do it ...
bin/codex-task.sh "Build the 6 slides in jobs/my-deck/PLAN.md by cloning the frames of page 'Templates'" my-deck
#    ... or write your own script (see docs/plugin-api-tips.md) and run it:
#    node bin/figma-run.mjs scripts/my-deck/02-build.js

# 5. Check: format (repeat until 0 violations) and logic review
node bin/figma-run.mjs scripts/lint-format.js --arg frame=<slide-or-parent-id> --json jobs/my-deck/lint.json
bin/review-logic.sh my-deck $FIGMA_FILE_KEY <slide-id,slide-id,...>

# 6. Export one PDF
rm -rf exports/my-deck/slides    # fresh folder, so renamed or removed slides do not linger
node bin/figma-api.mjs export $FIGMA_FILE_KEY <slide-id,...> --format pdf --out exports/my-deck/slides
bin/deck-pdf.sh exports/my-deck/slides/*.pdf -o exports/my-deck/deck.pdf
```
In Claude Code you can simply ask "make a 6-slide proposal in Figma from this brief" — the skills tell it to plan first, then use these commands. A finished job looks like [examples/REPORT.md](examples/REPORT.md).

## Commands
| command | what it does |
|---|---|
| `node bin/figma-run.mjs <script.js> [--file key] [--node id] [--json out] [--asset name=path] [--arg k=v] [--wait sec]` | Run a Plugin API script in the Figma editor through Aside |
| `node bin/figma-api.mjs me \| projects \| files \| file \| nodes \| inventory \| export` | Figma REST (read-only): inventory, node JSON, PNG/JPG/SVG/PDF export |
| `bin/deck-pdf.sh <files...> -o out.pdf` | Merge exported PNG/PDF slides into one PDF |
| `bin/codex-task.sh "<job>" [job-name]` | Delegate one build to Codex → `jobs/<job>/REPORT.md` |
| `bin/review-logic.sh <job> <key> <ids>` | Logic review by a fresh Codex session without the authoring context → `jobs/<job>/logic-review.md` |
| `bin/aside-js.sh <file.js>` | Plain `aside repl` with the shared lock (Figma pages outside the editor) |
| `bin/aside-lock.mjs` | The shared Aside lock used by figma-run.mjs and aside-js.sh |
| `node bin/save-pngs.mjs <png.json> <dir>` | Write PNGs returned by `scripts/export-png.js` to files |
| `bin/check.sh` | Offline syntax check of all tools and scripts |
| `scripts/lint-format.js` | Format check: margins, min size, off-theme HEX, white on orange, image slides, overlap, overflow |
| `scripts/inventory.js` | Pages → frames → slides, through the editor (no token needed) |
| `scripts/export-png.js` | PNG export inside the editor (`exportAsync`), when the REST export is rate-limited |
| `scripts/fit-headline.js` | One-line headlines fitted to the body width |
| `scripts/scan-words.js` | Find banned words (internal names, jargon, WIP) on a page |
| `scripts/strip-name-tag.js` | Remove tags like `[WIP] ` from one job's copy names |

`node bin/figma-api.mjs --help` and `node bin/figma-run.mjs --help` print full usage. All environment variables are listed in [.env.example](.env.example).

## Layout
```
skills/      Claude Code skills (figma-deck, deck-method)
bin/         command-line tools
scripts/     shared Plugin API scripts (per-job scripts go to scripts/<job>/, git-ignored)
docs/        method (EN + KO), Plugin API tips, troubleshooting, errata template
examples/    sample PLAN.md / REPORT.md with fictional data
AGENTS.md    rules for coding agents working in this repo
```
Work folders `jobs/`, `cache/`, `exports/` are created on demand and git-ignored.

## Safety
- Tools never print the token. Keep `.env` out of git (it is ignored).
- Scripts only edit **copies** (`<job> NN · title`); source frames are never edited, moved or deleted by the tools' rules.
- `codex-task.sh` runs Codex with `danger-full-access` by default, because `figma-run.mjs` must start the Aside browser and write its lock and payload outside the repo. Set `CODEX_SANDBOX` to change it.
- `review-logic.sh` starts a fresh, read-only Codex session in an empty temporary folder that holds only the slide PNGs: it is not handed the plan or the scripts. This is not a read sandbox, and your global Codex settings still apply.

More: [docs/method.md](docs/method.md) · [docs/plugin-api-tips.md](docs/plugin-api-tips.md) · [docs/troubleshooting.md](docs/troubleshooting.md)

## License
MIT

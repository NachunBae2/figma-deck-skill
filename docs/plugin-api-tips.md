# Writing Plugin API scripts

Scripts in `scripts/` (and the per-job scripts Codex writes in `scripts/<job>/`) are **bodies of an async function**. `bin/figma-run.mjs` runs them inside the Figma web editor with three globals:

| global | what |
|---|---|
| `figma` | the regular [Figma Plugin API](https://www.figma.com/plugin-docs/) object of the open file |
| `assets` | `{ name: Uint8Array }` from `--asset name=path.png` |
| `args` | `{ key: string }` from `--arg key=value` |

`return` a JSON-serialisable value; it is printed and, with `--json out.json`, saved as `{ ok, result }`. Top-level `await` works. The whole run (open tab + script) must finish within Aside's 120 s repl timeout.

```js
// what:  ...  usage: ...  env: ...   (three header lines, see AGENTS.md)
const page = figma.root.children.find((p) => p.name === args.page);
await page.loadAsync();
return page.children.map((n) => ({ id: n.id, name: n.name, type: n.type }));
```

## Rules of thumb
- **Load before you touch.** `await page.loadAsync()` before reading a page (dynamic page loading). `await figma.loadFontAsync(node.fontName)` before editing text; for mixed fonts load each range (`node.getRangeFontName(start, end)`).
- **Work on copies.** `const copy = frame.clone(); copy.name = '<job> 01 · Title'; copy.x = frame.x + frame.width + 200;` Never edit, move or delete source frames.
- **Replacing an image.** `const img = figma.createImage(assets.photo); node.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: img.hash }];` Pass the bytes with `--asset photo=path.png` — never as base64 on the command line (large strings overflow the repl's stack around 1 MB).
- **Wait before the tab closes.** New images and the last edits are saved asynchronously. End scripts that write with `await img.getSizeAsync(); await new Promise((r) => setTimeout(r, 15000));` (8 s is enough for text-only edits). Otherwise fills can be saved as an empty array. Confirm with a second, read-only run (e.g. read back the `imageHash`).
- **Exporting.** `await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } })` returns a Uint8Array — fine for one slide. For many slides the REST export (`bin/figma-api.mjs export`) is faster.
- **Return small results.** Return ids, names and counts. Dump long text with `--json` to a file instead of printing it.
- **Read first, then write.** Each job starts with a read-only script that dumps the text and structure of the frames you will change; write scripts use those ids instead of guessing.

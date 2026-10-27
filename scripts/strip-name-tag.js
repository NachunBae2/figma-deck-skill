// what:  Remove a status tag such as "[WIP] " from page names and top-level frame names (names only; content is untouched).
// usage: node bin/figma-run.mjs scripts/strip-name-tag.js [--arg tag=WIP]
// env:   none (args: tag = text inside the square brackets, default WIP)
const mark = `[${args.tag || 'WIP'}]`;
const strip = (s) => s.split(mark).map((part, i) => (i ? part.replace(/^\s+/, '') : part)).join('').trim();
const out = [];
for (const p of figma.root.children) {
  await p.loadAsync();
  if (p.name.includes(mark)) { const o = p.name; p.name = strip(p.name); out.push(['page', o, p.name]); }
  for (const f of p.children) if (f.name.includes(mark)) { const o = f.name; f.name = strip(f.name); out.push([p.name, o, f.name]); }
}
// Give the editor time to save before the tab closes.
await new Promise((r) => setTimeout(r, 8000));
return out;

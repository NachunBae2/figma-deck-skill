// what:  Remove a status tag such as "[WIP] " from the names of one job's copies (frames whose name contains the job name, also inside sections). Names only; content is untouched.
// usage: node bin/figma-run.mjs scripts/strip-name-tag.js --arg job=<job> [--arg tag=WIP]
// env:   none (args: job = job name the copies carry, required; tag = text inside the square brackets, default WIP)
if (!args.job) throw new Error('pass --arg job=<job> (only that job\'s copies are renamed)');
const mark = `[${args.tag || 'WIP'}]`;
const strip = (s) => s.split(mark).map((part, i) => (i ? part.replace(/^\s+/, '') : part)).join('').trim();
const out = [];
for (const p of figma.root.children) {
  await p.loadAsync();
  for (const f of p.findAll((n) => n.type === 'FRAME' && n.name.includes(args.job) && n.name.includes(mark))) { const o = f.name; f.name = strip(f.name); out.push([p.name, o, f.name]); }
}
// Give the editor time to save before the tab closes.
await new Promise((r) => setTimeout(r, 8000));
return out;

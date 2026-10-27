// what:  Scan every text node and frame name on a page for words that must not appear in a client-facing deck (internal tool names, jargon, status labels).
// usage: node bin/figma-run.mjs scripts/scan-words.js --arg page="Client deck" --arg words="WIP,draft,internal,TODO" [--json jobs/<job>/scan.json]
// env:   none (args: page = page name, default current page; words = comma-separated list, matched case-insensitively)
const words = (args.words || 'WIP,TODO,draft').split(',').map((w) => w.trim()).filter(Boolean);
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BAN = new RegExp(words.map(esc).join('|'), 'i');
const page = args.page ? figma.root.children.find((p) => p.name === args.page) : figma.currentPage;
if (!page) throw new Error(`page not found: ${args.page}`);
await page.loadAsync();
const hits = [];
for (const f of page.children) {
  if (BAN.test(f.name)) hits.push({ frame: f.name, id: f.id, where: 'frame name', match: f.name.match(BAN)[0] });
  if (!('findAll' in f)) continue;
  for (const t of f.findAll((n) => n.type === 'TEXT')) if (BAN.test(t.characters)) hits.push({ frame: f.name, id: t.id, where: 'text', match: t.characters.match(BAN)[0], text: t.characters.slice(0, 80) });
}
return { page: page.name, words, frames: page.children.length, hits };

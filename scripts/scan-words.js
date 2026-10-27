// what:  Scan the page name, every node name and every text on a page (recursively) for words that must not appear in a client-facing deck (internal tool names, jargon, status labels).
// usage: node bin/figma-run.mjs scripts/scan-words.js --arg page="Client deck" --arg words="WIP,draft,internal,TODO" [--json jobs/<job>/scan.json]
// env:   none (args: page = page name, default current page; words = comma-separated list, matched case-insensitively)
const words = (args.words || 'WIP,TODO,draft').split(',').map((w) => w.trim()).filter(Boolean);
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const banned = new RegExp(words.map(esc).join('|'), 'i');
const page = args.page ? figma.root.children.find((p) => p.name === args.page) : figma.currentPage;
if (!page) throw new Error(`page not found: ${args.page}`);
await page.loadAsync();
const topOf = (n) => { while (n.parent && n.parent.type !== 'PAGE') n = n.parent; return n; };
const hits = [];
if (banned.test(page.name)) hits.push({ frame: null, id: page.id, where: 'page name', match: page.name.match(banned)[0], text: page.name.slice(0, 80) });
for (const n of page.findAll(() => true)) {
  const top = topOf(n).name;
  if (banned.test(n.name)) hits.push({ frame: top, id: n.id, where: `${n.type.toLowerCase()} name`, match: n.name.match(banned)[0], text: n.name.slice(0, 80) });
  if (n.type === 'TEXT' && banned.test(n.characters)) hits.push({ frame: top, id: n.id, where: 'text', match: n.characters.match(banned)[0], text: n.characters.slice(0, 80) });
}
return { page: page.name, words, topLevelNodes: page.children.length, hits };

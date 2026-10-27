// what:  Inventory of the open file through the Plugin API: pages -> top-level nodes -> their direct children (slides). Works without a REST token.
// usage: node bin/figma-run.mjs scripts/inventory.js --json cache/inventory.json
// env:   none
const out = [];
for (const pg of figma.root.children) {
  await pg.loadAsync();
  const page = { page: pg.name, id: pg.id, items: [] };
  for (const c of pg.children) {
    const item = { type: c.type, name: c.name, id: c.id, w: Math.round(c.width || 0), h: Math.round(c.height || 0), kids: [] };
    if ('children' in c) for (const k of c.children) item.kids.push({ type: k.type, name: k.name, id: k.id, w: Math.round(k.width || 0), h: Math.round(k.height || 0), n: ('children' in k) ? k.children.length : 0 });
    page.items.push(item);
  }
  out.push(page);
}
return out;

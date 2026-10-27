// what:  Export frames as PNG inside the editor with exportAsync (no REST call, so no REST rate limit) and return them as base64.
// usage: node bin/figma-run.mjs scripts/export-png.js --arg ids=12:3,12:9 [--arg scale=1] --json jobs/<job>/png.json > /dev/null && node bin/save-pngs.mjs jobs/<job>/png.json jobs/<job>/review-png
// env:   none (args: ids = node ids in slide order; scale = export scale, default 1)
const ids = (args.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) throw new Error('pass --arg ids=<node id,...>');
const scale = Number(args.scale || 1);
const out = {};
for (const id of ids) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { out[id] = null; continue; }
  const bytes = await n.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } });
  out[id] = { name: n.name, png: figma.base64Encode(bytes) };
}
return out;

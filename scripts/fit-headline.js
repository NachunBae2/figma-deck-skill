// what:  Make headlines one line that ends at the right edge of the body area: auto width, font size scaled to the available width (capped), and an optional subtitle moved just below.
// usage: node bin/figma-run.mjs scripts/fit-headline.js --arg ids=12:3,12:9 --arg right=1824 [--arg max=52] [--arg sub=Sub] [--arg gap=14]
// env:   none (args: ids = headline TEXT node ids; right = x of the body area's right edge in the slide; max = largest font size in px; sub = name of the subtitle TEXT node in the same parent; gap = px between headline and subtitle)
const ids = (args.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) throw new Error('pass --arg ids=<text node id,...>');
const RIGHT = Number(args.right || 1824), MAX = Number(args.max || 52), GAP = Number(args.gap || 14), SUB = args.sub || 'Sub';
const out = [];
for (const id of ids) {
  const t = await figma.getNodeByIdAsync(id);
  if (!t || t.type !== 'TEXT') { out.push({ id, error: 'not a text node' }); continue; }
  await figma.loadFontAsync(t.fontName);
  t.characters = t.characters.replace(/\s*\n\s*/g, ' ');
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  const slide = (() => { let n = t; while (n.parent && n.parent.type !== 'PAGE') n = n.parent; return n; })();
  const avail = RIGHT - (t.absoluteTransform[0][2] - slide.absoluteTransform[0][2]);
  t.fontSize = Math.min(MAX, Math.floor(t.fontSize * avail / t.width * 10) / 10);
  while (t.width > avail && t.fontSize > 1) t.fontSize = t.fontSize - 0.5;
  const sub = t.parent.findOne((n) => n.type === 'TEXT' && n.name === SUB && n.id !== id);
  if (sub) sub.y = Math.round(t.y + t.height + GAP);
  out.push({ id, size: t.fontSize, width: Math.round(t.width), available: Math.round(avail), short: t.fontSize >= MAX && t.width < avail * 0.9, subY: sub ? sub.y : null });
}
// Give the editor time to save before the tab closes.
await new Promise((r) => setTimeout(r, 8000));
return out;

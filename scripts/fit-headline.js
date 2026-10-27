// what:  Make headlines one line that ends at the right edge of the body area: auto width, font size scaled to the available width (capped), and an optional subtitle moved just below.
// usage: node bin/figma-run.mjs scripts/fit-headline.js --arg ids=12:3,12:9 --arg right=1824 [--arg max=52] [--arg sub=Sub] [--arg gap=14]
// env:   none (args: ids = headline TEXT node ids; right = x of the body area's right edge, measured from the slide's left edge; max = largest font size in px; sub = name of the subtitle TEXT node in the same parent; gap = px between headline and subtitle)
const ids = (args.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) throw new Error('pass --arg ids=<text node id,...>');
const right = Number(args.right || 1824), maxSize = Number(args.max || 52), gap = Number(args.gap || 14), subName = args.sub || 'Sub';
// The slide is the nearest ancestor frame with a slide ratio (16:9 or A4 portrait); otherwise the top-level node under the page.
const isSlide = (n) => n.type === 'FRAME' && n.height > 0 && (Math.abs(n.width / n.height - 16 / 9) < 0.05 || Math.abs(n.width / n.height - 595 / 842) < 0.05);
const slideOf = (t) => { let top = t; for (let n = t.parent; n && n.type !== 'PAGE'; n = n.parent) { if (isSlide(n)) return n; top = n; } return top; };
const out = [];
for (const id of ids) {
  const t = await figma.getNodeByIdAsync(id);
  if (!t || t.type !== 'TEXT') { out.push({ id, error: 'not a text node' }); continue; }
  if (t.fontSize === figma.mixed) { out.push({ id, error: 'mixed font sizes — make the headline one size first' }); continue; }
  const fonts = t.fontName === figma.mixed ? t.getStyledTextSegments(['fontName']).map((s) => s.fontName) : [t.fontName];
  for (const f of fonts) await figma.loadFontAsync(f);
  const slide = slideOf(t);
  const avail = right - (t.absoluteTransform[0][2] - slide.absoluteTransform[0][2]);
  if (!(avail > 0)) { out.push({ id, error: `no room: headline starts right of x=${right} in slide ${slide.name}` }); continue; }
  t.characters = t.characters.replace(/\s*\n\s*/g, ' ');
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  t.fontSize = Math.min(maxSize, Math.floor(t.fontSize * avail / t.width * 10) / 10);
  while (t.width > avail && t.fontSize > 1) t.fontSize = t.fontSize - 0.5;
  const sub = t.parent.findOne((n) => n.type === 'TEXT' && n.name === subName && n.id !== id);
  if (sub) sub.y = Math.round(t.y + t.height + gap);
  out.push({ id, slide: slide.name, size: t.fontSize, width: Math.round(t.width), available: Math.round(avail), tooShort: t.fontSize >= maxSize && t.width < avail * 0.9, subY: sub ? sub.y : null });
}
// Give the editor time to save before the tab closes.
await new Promise((r) => setTimeout(r, 8000));
return out;

// what:  Format check (machine side of docs/method.md §3) for the slides in one frame: text outside the margin guide, text under 10pt, hard-coded HEX colours outside the theme, white on orange, full-image slides, image tables/charts, overlaps, overflow candidates.
// usage: node bin/figma-run.mjs scripts/lint-format.js --node 42:2 --arg frame=42:2 [--arg margin=0.05] [--arg minpt=10] [--json jobs/<job>/lint.json]
// env:   none (args: frame = slide or parent frame id, default = current selection or first frame; margin = guide ratio; minpt = minimum body size). Header/footer bands are excluded.
const frameId = args.frame;
const marginRatio = Number(args.margin || 0.05);
const minPt = Number(args.minpt || 10);

for (const pg of figma.root.children) await pg.loadAsync();
let root = frameId ? await figma.getNodeByIdAsync(frameId) : (figma.currentPage.selection[0] || figma.currentPage.children.find((c) => c.type === 'FRAME'));
if (!root) throw new Error('no target frame — pass --arg frame=<id>');

// Slides = root itself if it has a slide ratio (16:9 or A4 portrait), otherwise its direct child frames
const isSlide = (n) => n.type === 'FRAME' && n.width > 0 && (Math.abs(n.width / n.height - 16 / 9) < 0.05 || Math.abs(n.width / n.height - 595 / 842) < 0.05);
const slides = isSlide(root) ? [root] : (root.children || []).filter(isSlide);
if (!slides.length) throw new Error('no slide frames (16:9 or A4 ratio) found');

// Theme colours = local paint styles + colour variables; any other fixed colour is a 'hard-coded HEX'
const themeHex = new Set();
const toHex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
try { for (const st of await figma.getLocalPaintStylesAsync()) for (const p of st.paints) if (p.type === 'SOLID') themeHex.add(toHex(p.color)); } catch {}
try { for (const v of await figma.variables.getLocalVariablesAsync('COLOR')) for (const val of Object.values(v.valuesByMode)) if (val && typeof val === 'object' && 'r' in val) themeHex.add(toHex(val)); } catch {}
const NEUTRAL = (hex) => { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return Math.max(r, g, b) - Math.min(r, g, b) < 12; }; // black, greys and white count as theme
const isOrange = (hex) => { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return r > 200 && g > 80 && g < 170 && b < 90; };
const isWhite = (hex) => hex === '#FFFFFF' || hex === '#FEFEFE';

const solidFill = (n) => { const f = Array.isArray(n.fills) ? n.fills.find((p) => p.type === 'SOLID' && p.visible !== false) : null; return f ? toHex(f.color) : null; };
const boundFill = (n) => { const f = Array.isArray(n.fills) ? n.fills.find((p) => p.visible !== false) : null; return f ? f.type : null; };
const rectOf = (n) => n.absoluteBoundingBox || { x: n.absoluteTransform[0][2], y: n.absoluteTransform[1][2], width: n.width, height: n.height };
const inter = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
const walk = (n, acc = []) => { acc.push(n); if ('children' in n) for (const k of n.children) if (k.visible !== false) walk(k, acc); return acc; };

const report = [];
for (const s of slides) {
  const pxPerPt = Math.abs(s.width / s.height - 16 / 9) < 0.05 ? s.width / 960 : s.width / 595;
  const minPx = minPt * pxPerPt;
  const R = rectOf(s);
  const guide = { x: R.x + R.width * marginRatio, y: R.y + R.height * marginRatio, width: R.width * (1 - 2 * marginRatio), height: R.height * (1 - 2 * marginRatio) };
  const nodes = walk(s).slice(1);
  const v = [];
  const allTexts = nodes.filter((n) => n.type === 'TEXT');
  // Header/footer text (fully inside the top or bottom 7% band: page numbers, running heads) is exempt from the body rules (guide, 10pt)
  const isChrome = (t) => { const r = rectOf(t); return (r.y + r.height <= R.y + R.height * 0.07) || (r.y >= R.y + R.height * 0.93); };
  const chrome = allTexts.filter(isChrome);
  const texts = allTexts.filter((t) => !isChrome(t));
  const sizesPt = [];
  // 1) body objects outside the margin guide (backgrounds = anything over 60% of the slide area are skipped)
  for (const n of nodes.filter((n) => ['TEXT', 'RECTANGLE', 'FRAME', 'GROUP', 'INSTANCE', 'VECTOR', 'LINE', 'ELLIPSE'].includes(n.type))) {
    const r = rectOf(n); if (!r) continue;
    const isBackground = r.width * r.height > R.width * R.height * 0.6;
    if (isBackground) continue;
    const out = r.x < guide.x - 1 || r.y < guide.y - 1 || r.x + r.width > guide.x + guide.width + 1 || r.y + r.height > guide.y + guide.height + 1;
    if (out && n.type === 'TEXT' && !isChrome(n)) v.push({ rule: 'outside margin guide', node: n.id, name: n.name.slice(0, 40) });
  }
  // 2) text below the minimum size
  for (const t of texts) {
    const fs = t.fontSize === figma.mixed ? Math.min(...t.getStyledTextSegments(['fontSize']).map((seg) => seg.fontSize)) : t.fontSize;
    sizesPt.push(+(fs / pxPerPt).toFixed(1));
    if (fs < minPx - 0.01) v.push({ rule: `text under ${minPt}pt`, node: t.id, name: t.name.slice(0, 40), size: `${(fs / pxPerPt).toFixed(1)}pt`, text: (t.characters || '').slice(0, 30) });
  }
  // 3) hard-coded HEX text colour (outside theme/neutrals), 4) white text on orange
  for (const t of texts) {
    const hex = t.fills === figma.mixed ? null : solidFill(t);
    if (hex && !NEUTRAL(hex) && !themeHex.has(hex) && t.fillStyleId === '' ) v.push({ rule: 'hard-coded HEX text colour', node: t.id, name: t.name.slice(0, 40), hex });
    if (hex && isWhite(hex)) {
      const tr = rectOf(t);
      const under = nodes.filter((n) => n !== t && ['RECTANGLE', 'FRAME', 'ELLIPSE'].includes(n.type)).filter((n) => inter(rectOf(n), tr) > tr.width * tr.height * 0.8).map(solidFill).filter(Boolean);
      if (under.some(isOrange)) v.push({ rule: 'white text on orange', node: t.id, name: t.name.slice(0, 40) });
    }
  }
  for (const n of nodes.filter((n) => n.type === 'RECTANGLE' || n.type === 'FRAME')) {
    const hex = solidFill(n); const r = rectOf(n);
    if (hex && !NEUTRAL(hex) && !themeHex.has(hex) && n.fillStyleId === '' && r.width * r.height < R.width * R.height * 0.6) v.push({ rule: 'hard-coded HEX fill', node: n.id, name: n.name.slice(0, 40), hex });
  }
  // 5) full-image slide / tables or charts pasted as images
  const imgs = nodes.filter((n) => boundFill(n) === 'IMAGE').map((n) => ({ n, a: (() => { const r = rectOf(n); return r.width * r.height; })() }));
  const big = imgs.filter((i) => i.a > R.width * R.height * 0.5);
  if (big.length && texts.length <= 2) v.push({ rule: 'full-image slide', node: big[0].n.id, name: big[0].n.name.slice(0, 40) });
  for (const i of imgs) if (/표|table|그래프|chart|차트/i.test(i.n.name) && i.a > R.width * R.height * 0.08) v.push({ rule: 'table/chart as image (not native)', node: i.n.id, name: i.n.name.slice(0, 40) });
  // 6) text-on-text overlap, 7) overflow candidates
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = rectOf(texts[i]), b = rectOf(texts[j]); const ov = inter(a, b);
    if (ov > 0.2 * Math.min(a.width * a.height, b.width * b.height)) v.push({ rule: 'text overlap', node: texts[i].id, with: texts[j].id, name: `${texts[i].name.slice(0, 20)} × ${texts[j].name.slice(0, 20)}` });
  }
  for (const t of texts) {
    if (t.textAutoResize === 'NONE' || t.textAutoResize === 'TRUNCATE') v.push({ rule: 'overflow candidate (fixed-size text box)', node: t.id, name: t.name.slice(0, 40), autoResize: t.textAutoResize });
    const r = rectOf(t); if (r.x + r.width > R.x + R.width + 1 || r.y + r.height > R.y + R.height + 1) v.push({ rule: 'text runs off the slide', node: t.id, name: t.name.slice(0, 40) });
  }
  const hist = {}; for (const z of sizesPt) hist[z] = (hist[z] || 0) + 1;
  report.push({ slide: s.name, id: s.id, size: `${Math.round(s.width)}x${Math.round(s.height)}`, minPx: +minPx.toFixed(1), texts: texts.length, headerFooterTexts: chrome.length, fontSizesPt: hist, violations: v });
}
return { frame: root.name, slides: report.length, themeColors: [...themeHex], totalViolations: report.reduce((a, r) => a + r.violations.length, 0), report };

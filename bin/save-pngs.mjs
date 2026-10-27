#!/usr/bin/env node
// what:  Write the PNGs returned by scripts/export-png.js (figma-run.mjs --json output) to files named NN-<node name>.png, in slide order.
// usage: node bin/save-pngs.mjs <png.json> <out-dir>
// env:   none
import fs from 'node:fs';
import path from 'node:path';

const [src, dir] = process.argv.slice(2);
const USAGE = 'usage: node bin/save-pngs.mjs <png.json> <out-dir>';
if (process.argv.includes('--help')) { console.log(USAGE); process.exit(0); }
if (!src || !dir) { console.error(USAGE); process.exit(2); }
const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const pngs = data && typeof data === 'object' && 'result' in data ? data.result : data;
const safeName = (s) => s.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
fs.mkdirSync(dir, { recursive: true });
let missing = 0;
Object.entries(pngs || {}).forEach(([id, v], i) => {
  if (!v) { console.error(`not found: ${id}`); missing++; return; }
  const fp = path.join(dir, `${String(i + 1).padStart(2, '0')}-${safeName(v.name || id)}.png`);
  fs.writeFileSync(fp, Buffer.from(v.png, 'base64'));
  console.log(fp);
});
if (missing) process.exitCode = 1;

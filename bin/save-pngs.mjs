#!/usr/bin/env node
// what:  Write the PNGs returned by scripts/export-png.js (figma-run.mjs --json output) to files named NN-<node name>.png, in slide order. Old NN-*.png files in the folder are removed first.
// usage: node bin/save-pngs.mjs <png.json> <out-dir>
// env:   none
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [src, dir] = process.argv.slice(2);
const USAGE = 'usage: node bin/save-pngs.mjs <png.json> <out-dir>';
if (process.argv.includes('--help')) { console.log(USAGE); process.exit(0); }
if (!src || !dir) { console.error(USAGE); process.exit(2); }
const data = JSON.parse(fs.readFileSync(src, 'utf8'));
if (data && data.ok === false) { console.error(`figma-run reported an error, nothing written: ${data.error}`); process.exit(1); }
const pngs = data && typeof data === 'object' && 'result' in data ? data.result : data;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_END = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]); // IEND chunk
// A complete PNG: signature, IHDR first, chunks that fit exactly, IEND last, and IDAT data that inflates.
function isPng(b) {
  if (b.length < 8 + 25 + 12 || !b.subarray(0, 8).equals(PNG_SIGNATURE) || b.toString('latin1', 12, 16) !== 'IHDR' || !b.subarray(-12).equals(PNG_END)) return false;
  const idat = [];
  for (let at = 8; at < b.length;) {
    if (at + 12 > b.length) return false;
    const len = b.readUInt32BE(at); const type = b.toString('latin1', at + 4, at + 8);
    if (at + 12 + len > b.length) return false;
    if (type === 'IDAT') idat.push(b.subarray(at + 8, at + 8 + len));
    at += 12 + len;
    if (type === 'IEND') return at === b.length && idat.length > 0 && (() => { try { return zlib.inflateSync(Buffer.concat(idat)).length > 0; } catch { return false; } })();
  }
  return false;
}
const bad = (why) => { console.error(`not export-png.js output (${why}), nothing written: ${src}`); process.exit(1); };
if (!pngs || typeof pngs !== 'object' || Array.isArray(pngs)) bad('no { id: { name, png } } map');
// Decode and check every image before touching the output folder.
const decoded = Object.entries(pngs).map(([id, v]) => {
  if (v === null) return [id, null];
  if (!v || typeof v.png !== 'string' || (v.name !== undefined && typeof v.name !== 'string')) bad(`bad entry ${id}`);
  const buf = Buffer.from(v.png, 'base64');
  if (!isPng(buf)) bad(`entry ${id} is not a complete PNG`);
  return [id, { name: v.name || id, buf }];
});
if (!decoded.some(([, v]) => v)) bad('no images');
const safeName = (s) => s.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
fs.mkdirSync(dir, { recursive: true });
for (const f of fs.readdirSync(dir)) if (/^\d+-.*\.png$/.test(f)) fs.rmSync(path.join(dir, f)); // stale slides from an earlier run
const entries = decoded;
const padWidth = Math.max(2, String(entries.length).length);
let missing = 0;
entries.forEach(([id, v], i) => {
  if (!v) { console.error(`not found: ${id}`); missing++; return; }
  const fp = path.join(dir, `${String(i + 1).padStart(padWidth, '0')}-${safeName(v.name)}.png`);
  fs.writeFileSync(fp, v.buf);
  console.log(fp);
});
if (missing) process.exitCode = 1;

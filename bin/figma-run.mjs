#!/usr/bin/env node
// what:  Open a Figma file in the Aside browser and run a Plugin API script (async function body; globals figma, assets, args; `return` a JSON value).
// usage: node bin/figma-run.mjs <script.js> [--file <key>] [--node <node-id>] [--json <out.json>] [--asset name=path.png ...] [--arg key=value ...] [--wait <sec>]
// env:   FIGMA_FILE_KEY (default --file), ASIDE_LOCK (default /tmp/figma-deck-aside.lock), ASIDE_PAYLOAD_DIR (default ~/.aside/u/0/figma-deck), ASIDE_BIN (default aside)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const USAGE = `usage: node bin/figma-run.mjs <script.js> [--file key] [--node id] [--json out.json] [--asset name=path ...] [--arg key=value ...] [--wait sec]
  The script is the body of an async function with globals figma, assets (name -> Uint8Array), args (name -> string).
  Its return value is printed as JSON (and written to --json). One Aside call is allowed at a time: a shared lock
  file serialises runs (waits up to 20 min for another holder; locks older than 15 min are considered stale).
env: FIGMA_FILE_KEY, ASIDE_LOCK, ASIDE_PAYLOAD_DIR, ASIDE_BIN`;

const LOCK = process.env.ASIDE_LOCK || '/tmp/figma-deck-aside.lock';
const HOLDER = 'figma-deck';
// A directory the Aside repl can read with fs.readFile (Aside sandbox for account u0).
const PAYLOAD_DIR = process.env.ASIDE_PAYLOAD_DIR || path.join(os.homedir(), '.aside/u/0/figma-deck');
const ASIDE_BIN = process.env.ASIDE_BIN || 'aside';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(0); }
const FLAGS_WITH_VALUE = new Set(['--file', '--node', '--json', '--asset', '--wait', '--arg']);
const positional = argv.filter((a, i) => !a.startsWith('--') && !FLAGS_WITH_VALUE.has(argv[i - 1]));
const script = positional[0];
const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const assets = argv.flatMap((a, i) => (a === '--asset' ? [argv[i + 1]] : []));
const args = Object.fromEntries(argv.flatMap((a, i) => (a === '--arg' ? [argv[i + 1].split(/=(.*)/s).slice(0, 2)] : [])));
if (!script || !fs.existsSync(script)) { console.error(USAGE); process.exit(2); }

const fileKey = opt('file', process.env.FIGMA_FILE_KEY);
if (!fileKey) { console.error('no Figma file: pass --file <key> or set FIGMA_FILE_KEY (the <key> in figma.com/design/<key>/...)'); process.exit(2); }
const nodeId = opt('node');
const waitSec = Number(opt('wait', '60'));
const url = `https://www.figma.com/design/${fileKey}/x${nodeId ? `?node-id=${encodeURIComponent(nodeId.replace(':', '-'))}` : ''}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readLock = () => { try { return JSON.parse(fs.readFileSync(LOCK, 'utf8')); } catch { return null; } };
async function takeLock() {
  for (let i = 0; i < 120; i++) {
    const l = readLock();
    const ageMin = l ? (Date.now() - Date.parse(l.at)) / 60000 : 99;
    if (!l || ageMin >= 15 || l.holder === HOLDER) break;
    if (i === 0) console.error(`waiting for Aside lock: ${l.holder} (${ageMin.toFixed(1)} min)`);
    await sleep(10000);
  }
  fs.writeFileSync(LOCK, JSON.stringify({ holder: HOLDER, at: new Date().toISOString() }));
}
const dropLock = () => { const l = readLock(); if (l && l.holder === HOLDER) fs.rmSync(LOCK, { force: true }); };

fs.mkdirSync(PAYLOAD_DIR, { recursive: true });
const payload = {
  script: fs.readFileSync(script, 'utf8'),
  args,
  assets: Object.fromEntries(assets.map((s) => { const i = s.indexOf('='); return [s.slice(0, i), fs.readFileSync(s.slice(i + 1)).toString('base64')]; })),
};
const payloadPath = path.join(PAYLOAD_DIR, `payload-${process.pid}-${Date.now()}.json`);
fs.writeFileSync(payloadPath, JSON.stringify(payload));

// Code that runs inside `aside repl`. In the page, the script body runs through new AsyncFunction (the Figma editor allows eval).
const repl = `const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const payload = JSON.parse(Buffer.from(await fs.readFile(${JSON.stringify(payloadPath)})).toString('utf8'));
const p = await openTab(${JSON.stringify(url)});
let ready=false; for (let i=0;i<${Math.ceil(waitSec / 2)} && !ready;i++){ await sleep(2000); try { ready = await p.evaluate(()=>typeof figma==='object' && !!figma.root && !!figma.currentPage); } catch {} }
let out;
if (!ready) out = { ok:false, error:'figma editor not ready in ${waitSec}s' };
else {
  try {
    out = await p.evaluate(async ({ src, assets: a, args }) => {
      const assets = {}; for (const k in a) assets[k] = Uint8Array.from(atob(a[k]), (c) => c.charCodeAt(0));
      try { const AF = Object.getPrototypeOf(async function () {}).constructor; const fn = new AF('figma', 'assets', 'args', src); const r = await fn(figma, assets, args); return { ok: true, result: r === undefined ? null : r }; }
      catch (e) { return { ok: false, error: String((e && e.stack) || e) }; }
    }, { src: payload.script, assets: payload.assets, args: payload.args || {} });
  } catch (e) { out = { ok:false, error:'evaluate failed: ' + (e && e.message || e) }; }
}
console.log('__FIGMA_RESULT__' + JSON.stringify(out));`;

let res;
try {
  await takeLock();
  res = spawnSync(ASIDE_BIN, ['repl', repl], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} finally {
  dropLock();
  fs.rmSync(payloadPath, { force: true });
}
if (res.error) { console.error(`could not start "${ASIDE_BIN}": ${res.error.message} (install Aside or set ASIDE_BIN)`); process.exit(1); }
const stdout = (res.stdout || '') + (res.stderr || '');
const line = stdout.split('\n').find((l) => l.includes('__FIGMA_RESULT__'));
if (!line) { console.error('no result in Aside output:\n' + stdout.slice(-1500)); process.exit(1); }
const out = JSON.parse(line.slice(line.indexOf('__FIGMA_RESULT__') + '__FIGMA_RESULT__'.length));
if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(out, null, 2));
if (!out.ok) { console.error('script error: ' + out.error); process.exit(1); }
const r = out.result;
console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 2));

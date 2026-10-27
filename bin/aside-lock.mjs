#!/usr/bin/env node
// what:  Shared Aside lock (one Aside call at a time): atomic create, a unique owner per run, stale after 15 min, gives up after 20 min of waiting.
// usage: import { takeLock, dropLock } from './aside-lock.mjs'   |   node bin/aside-lock.mjs take <owner> | drop <owner>
// env:   ASIDE_LOCK (default /tmp/figma-deck-aside.lock)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const LOCK = process.env.ASIDE_LOCK || '/tmp/figma-deck-aside.lock';
const STALE_MIN = 15;
const WAIT_TRIES = 120; // x 10 s = 20 min
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readLock = () => { try { return JSON.parse(fs.readFileSync(LOCK, 'utf8')); } catch { return null; } };

export async function takeLock(owner) {
  for (let i = 0; i < WAIT_TRIES; i++) {
    try { fs.writeFileSync(LOCK, JSON.stringify({ holder: owner, at: new Date().toISOString() }), { flag: 'wx' }); return; }
    catch (e) { if (e.code !== 'EEXIST') throw e; }
    const l = readLock();
    const ageMin = l ? (Date.now() - Date.parse(l.at)) / 60000 : Infinity;
    if (!l || !(ageMin < STALE_MIN)) { fs.rmSync(LOCK, { force: true }); continue; } // stale or unreadable lock
    if (i === 0) console.error(`waiting for Aside lock: ${l.holder} (${ageMin.toFixed(1)} min)`);
    await sleep(10000);
  }
  throw new Error(`Aside lock ${LOCK} still held after ${WAIT_TRIES / 6} min`);
}

export function dropLock(owner) {
  const l = readLock();
  if (l && l.holder === owner) fs.rmSync(LOCK, { force: true });
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const [cmd, owner] = process.argv.slice(2);
  if (!owner || !['take', 'drop'].includes(cmd)) { console.error('usage: node bin/aside-lock.mjs take|drop <owner>'); process.exit(2); }
  try { if (cmd === 'take') await takeLock(owner); else dropLock(owner); }
  catch (e) { console.error(e.message); process.exit(1); }
}

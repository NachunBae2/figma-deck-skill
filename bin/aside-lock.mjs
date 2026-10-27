#!/usr/bin/env node
// what:  Shared Aside lock (one Aside call at a time): an atomically created lock directory with a unique owner per run; stale after 15 min; gives up after 20 min of waiting.
// usage: import { takeLock, dropLock } from './aside-lock.mjs'   |   node bin/aside-lock.mjs take <owner> | drop <owner>
// env:   ASIDE_LOCK (lock directory, default /tmp/figma-deck-aside.lock)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lockDir = process.env.ASIDE_LOCK || '/tmp/figma-deck-aside.lock';
const ownerFile = path.join(lockDir, 'owner.json');
const staleMinutes = 15;
const waitTries = 120; // x 10 s = 20 min
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readOwner = (dir = lockDir) => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'owner.json'), 'utf8')); } catch { return null; } };

// Age of the lock: from owner.json, or from the directory itself while the owner file is still being written.
function lockState() {
  let st; try { st = fs.statSync(lockDir); } catch { return null; }
  const owner = readOwner();
  const since = owner ? Date.parse(owner.at) : st.mtimeMs;
  return { owner, stamp: owner ? owner.at : `mtime:${st.mtimeMs}`, ageMin: (Date.now() - since) / 60000 };
}

// Break a stale lock without removing a fresh one: move it aside atomically, then check it is the lock we judged stale.
function breakStale(stamp) {
  const moved = `${lockDir}.stale-${process.pid}-${Date.now()}`;
  try { fs.renameSync(lockDir, moved); } catch { return; } // someone else broke or released it first
  const owner = readOwner(moved);
  const movedStamp = owner ? owner.at : `mtime:${fs.statSync(moved).mtimeMs}`;
  if (movedStamp !== stamp) { try { fs.renameSync(moved, lockDir); return; } catch {} } // it was a new lock: put it back
  fs.rmSync(moved, { recursive: true, force: true });
}

export async function takeLock(owner) {
  for (let i = 0; i < waitTries; i++) {
    try {
      fs.mkdirSync(lockDir);
      fs.writeFileSync(ownerFile, JSON.stringify({ holder: owner, at: new Date().toISOString() }));
      return;
    } catch (e) { if (e.code !== 'EEXIST') throw e; }
    const s = lockState();
    if (!s) continue; // released in between
    if (!(s.ageMin < staleMinutes)) { breakStale(s.stamp); continue; }
    if (i === 0) console.error(`waiting for Aside lock: ${s.owner ? s.owner.holder : '(starting)'} (${s.ageMin.toFixed(1)} min)`);
    await sleep(10000);
  }
  throw new Error(`Aside lock ${lockDir} still held after ${waitTries / 6} min`);
}

export function dropLock(owner) {
  const o = readOwner();
  if (o && o.holder === owner) fs.rmSync(lockDir, { recursive: true, force: true });
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const [cmd, owner] = process.argv.slice(2);
  if (!owner || !['take', 'drop'].includes(cmd)) { console.error('usage: node bin/aside-lock.mjs take|drop <owner>'); process.exit(2); }
  try { if (cmd === 'take') await takeLock(owner); else dropLock(owner); }
  catch (e) { console.error(e.message); process.exit(1); }
}

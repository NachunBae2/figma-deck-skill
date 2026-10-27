#!/usr/bin/env node
// what:  Shared Aside lock (one Aside call at a time): an atomically created lock directory owned by one process; it is broken only when that process is gone; waiting gives up after 20 min.
// usage: import { takeLock, dropLock } from './aside-lock.mjs'   |   node bin/aside-lock.mjs take <owner> [pid] | drop <owner>
// env:   ASIDE_LOCK (lock directory, default /tmp/figma-deck-aside.lock)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCK_DIR = process.env.ASIDE_LOCK || '/tmp/figma-deck-aside.lock';
const BREAK_DIR = `${LOCK_DIR}.break`; // held for milliseconds while one process breaks a dead owner's lock
const WAIT_MS = 20 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ageMin = (p) => { try { return (Date.now() - fs.statSync(p).mtimeMs) / 60000; } catch { return null; } };
const readOwner = () => { try { return JSON.parse(fs.readFileSync(path.join(LOCK_DIR, 'owner.json'), 'utf8')); } catch { return null; } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

// Dead = the owner process no longer exists, or the owner file never got written (creator died right after mkdir).
function isDead() {
  const o = readOwner();
  if (o) return !alive(o.pid);
  const age = ageMin(LOCK_DIR);
  return age !== null && age > 1;
}

// Only one breaker at a time (mkdir is atomic). While we hold it, a dead lock cannot change: its owner is gone,
// nobody can create a new lock because the directory still exists, and other breakers wait.
// The breaker is never removed by age: if a breaker process crashed inside these few lines, a person removes it.
function breakIfDead() {
  try { fs.mkdirSync(BREAK_DIR); } catch { return false; }
  try { if (isDead()) fs.rmSync(LOCK_DIR, { recursive: true, force: true }); }
  finally { fs.rmSync(BREAK_DIR, { recursive: true, force: true }); }
  return true;
}

export async function takeLock(owner, pid = process.pid) {
  const deadline = Date.now() + WAIT_MS;
  for (let i = 0; Date.now() < deadline; i++) {
    try {
      fs.mkdirSync(LOCK_DIR);
      fs.writeFileSync(path.join(LOCK_DIR, 'owner.json'), JSON.stringify({ holder: owner, pid, at: new Date().toISOString() }));
      return;
    } catch (e) { if (e.code !== 'EEXIST') throw e; }
    if (isDead()) { if (breakIfDead()) continue; await sleep(1000); continue; } // another breaker is busy: back off
    const o = readOwner();
    if (i === 0) console.error(`waiting for Aside lock: ${o ? `${o.holder} (pid ${o.pid}, since ${o.at})` : '(starting)'}`);
    await sleep(10000);
  }
  const o = readOwner();
  const stuckBreaker = fs.existsSync(BREAK_DIR) ? `; if no run is active, remove ${BREAK_DIR}` : '';
  throw new Error(`Aside lock ${LOCK_DIR} still held after ${WAIT_MS / 60000} min${o ? ` by ${o.holder} (pid ${o.pid})` : ''}${stuckBreaker}`);
}

export function dropLock(owner) {
  const o = readOwner();
  if (o && o.holder === owner) fs.rmSync(LOCK_DIR, { recursive: true, force: true });
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const [cmd, owner, pid] = process.argv.slice(2);
  if (!owner || !['take', 'drop'].includes(cmd)) { console.error('usage: node bin/aside-lock.mjs take <owner> [pid] | drop <owner>'); process.exit(2); }
  // From a shell, pass the shell's pid ($$): this node process exits right away, the shell keeps the lock.
  try { if (cmd === 'take') await takeLock(owner, pid ? Number(pid) : process.ppid); else dropLock(owner); }
  catch (e) { console.error(e.message); process.exit(1); }
}

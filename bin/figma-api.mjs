#!/usr/bin/env node
// what:  Figma REST client (read-only): list projects/files, dump nodes, write a slide inventory, export PNG/JPG/SVG/PDF.
// usage: node bin/figma-api.mjs me | projects [teamId] | files <projectId> | file <key> [--depth N] | nodes <key> <id,id> | inventory <key> [--out dir] | export <key> <id,id,...> [--format png|jpg|svg|pdf] [--scale N] [--out dir]
// env:   FIGMA_TOKEN (personal access token) or, on macOS, FIGMA_KEYCHAIN_SERVICE [+ FIGMA_KEYCHAIN_ACCOUNT]; FIGMA_TEAM_ID (default team for `projects`). The token is never printed.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const USAGE = `usage: node bin/figma-api.mjs <command>
  me                                   current user (token check)
  projects [teamId]                    team projects (needs projects:read scope; default team = $FIGMA_TEAM_ID)
  files <projectId>                    files in a project
  file <key> [--depth N]               file tree (default depth 2)
  nodes <key> <id,id>                  node JSON
  inventory <key> [--out dir]          pages -> top-level nodes -> slide frames, written to cache/inventory-<key>-<date>.md
  export <key> <id,id,...> [--format png|jpg|svg|pdf] [--scale N] [--out dir]
                                       render nodes to files named NN-<node name>.<format> (default exports/export-<ts>/)
env: FIGMA_TOKEN, or FIGMA_KEYCHAIN_SERVICE [+ FIGMA_KEYCHAIN_ACCOUNT] (macOS keychain); FIGMA_TEAM_ID`;

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const [cmd, a1, a2] = argv.filter((a) => !a.startsWith('--') && !argv[argv.indexOf(a) - 1]?.startsWith('--'));
const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

if (argv.includes('--help') || argv.includes('-h') || cmd === 'help') { console.log(USAGE); process.exit(0); }

let cachedToken = null;
function token() {
  if (cachedToken) return cachedToken;
  if (process.env.FIGMA_TOKEN) return (cachedToken = process.env.FIGMA_TOKEN.trim());
  const service = process.env.FIGMA_KEYCHAIN_SERVICE;
  if (service) {
    const account = process.env.FIGMA_KEYCHAIN_ACCOUNT;
    try { return (cachedToken = execFileSync('security', ['find-generic-password', '-s', service, ...(account ? ['-a', account] : []), '-w'], { encoding: 'utf8' }).trim()); }
    catch { console.error(`keychain item "${service}" not found`); process.exit(2); }
  }
  console.error('no Figma token: set FIGMA_TOKEN (Figma > Settings > Security > Personal access tokens) or FIGMA_KEYCHAIN_SERVICE');
  process.exit(2);
}
async function api(p) {
  const r = await fetch(`https://api.figma.com/v1${p}`, { headers: { 'X-Figma-Token': token() } });
  if (r.status === 429) { await new Promise((s) => setTimeout(s, 15000)); return api(p); }
  if (!r.ok) throw new Error(`figma ${r.status} ${p}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
const safeName = (s) => s.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
const out = (o) => console.log(JSON.stringify(o, null, 2));
const need = (v, what) => { if (!v) { console.error(`missing ${what}\n\n${USAGE}`); process.exit(2); } return v; };

if (cmd === 'me') out(await api('/me'));
else if (cmd === 'projects') out((await api(`/teams/${need(a1 || process.env.FIGMA_TEAM_ID, 'teamId (or FIGMA_TEAM_ID)')}/projects`)).projects);
else if (cmd === 'files') out((await api(`/projects/${need(a1, 'projectId')}/files`)).files.map((f) => ({ key: f.key, name: f.name, last_modified: f.last_modified })));
else if (cmd === 'file') out(await api(`/files/${need(a1, 'file key')}?depth=${opt('depth', '2')}`));
else if (cmd === 'nodes') out(await api(`/files/${need(a1, 'file key')}/nodes?ids=${encodeURIComponent(need(a2, 'node ids'))}`));
else if (cmd === 'inventory') {
  const f = await api(`/files/${need(a1, 'file key')}?depth=3`);
  const lines = [`# ${f.name} (${a1}) — ${f.lastModified}`, ''];
  for (const page of f.document.children) {
    lines.push(`## Page ${page.name} (${page.id}) — ${page.children?.length || 0} top-level nodes`);
    for (const c of page.children || []) {
      const sz = c.absoluteBoundingBox ? `${Math.round(c.absoluteBoundingBox.width)}x${Math.round(c.absoluteBoundingBox.height)}` : '';
      lines.push(`- ${c.type} **${c.name}** ${sz} id=${c.id}` + (c.children?.length ? ` children ${c.children.length}` : ''));
      for (const k of (c.children || []).filter((k) => ['FRAME', 'SECTION', 'COMPONENT', 'INSTANCE'].includes(k.type)).slice(0, 60)) {
        const ks = k.absoluteBoundingBox ? `${Math.round(k.absoluteBoundingBox.width)}x${Math.round(k.absoluteBoundingBox.height)}` : '';
        lines.push(`  - ${k.type} ${k.name} ${ks} id=${k.id}`);
      }
    }
    lines.push('');
  }
  const dir = opt('out', path.join(ROOT, 'cache'));
  fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, `inventory-${a1}-${new Date().toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(fp, lines.join('\n'));
  console.log(fp); console.log(lines.slice(0, 60).join('\n'));
} else if (cmd === 'export') {
  need(a1, 'file key'); need(a2, 'node ids');
  const format = opt('format', 'png'); const scale = opt('scale', '1');
  const dir = opt('out', path.join(ROOT, 'exports', `export-${Date.now()}`));
  fs.mkdirSync(dir, { recursive: true });
  const ids = a2.split(',').map((s) => s.trim()).filter(Boolean);
  const names = {};
  try { const n = await api(`/files/${a1}/nodes?ids=${encodeURIComponent(ids.join(','))}&depth=1`); for (const [id, v] of Object.entries(n.nodes)) names[id] = v?.document?.name || id; } catch {}
  const written = [];
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    const r = await api(`/images/${a1}?ids=${encodeURIComponent(chunk.join(','))}&format=${format}${format === 'pdf' || format === 'svg' ? '' : `&scale=${scale}`}`);
    for (const [id, u] of Object.entries(r.images)) {
      if (!u) { console.error(`export failed: ${id}`); continue; }
      const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
      const idx = String(ids.indexOf(id) + 1).padStart(2, '0');
      const fp = path.join(dir, `${idx}-${safeName(names[id] || id)}.${format}`);
      fs.writeFileSync(fp, buf); written.push(fp);
    }
  }
  console.log(written.join('\n'));
} else { console.error(USAGE); process.exit(2); }

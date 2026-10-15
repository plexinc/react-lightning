// node lines.mjs <file.cpuprofile> <functionName> [urlPart]: hit lines (positionTicks) for a function.
import { readFileSync } from 'node:fs';
const [file, name, urlPart = ''] = process.argv.slice(2);
const p = JSON.parse(readFileSync(file, 'utf8'));
const lines = new Map(); let url = '';
for (const n of p.nodes) {
  if (n.callFrame.functionName !== name || !n.callFrame.url.includes(urlPart)) continue;
  url = n.callFrame.url;
  for (const t of n.positionTicks ?? []) lines.set(t.line, (lines.get(t.line) ?? 0) + t.ticks);
}
console.log(url);
for (const [l, t] of [...lines].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(t).padStart(6), l);

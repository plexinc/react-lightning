// node top.mjs <file.cpuprofile> [n]: self time by function (ms), plus total.
import { readFileSync } from 'node:fs';
const p = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const n = Number(process.argv[3] ?? 40);
const byId = new Map(p.nodes.map((x) => [x.id, x]));
const self = new Map();
const dt = p.timeDeltas;
for (let i = 0; i < p.samples.length; i++) { const id = p.samples[i]; self.set(id, (self.get(id) ?? 0) + (dt[i + 1] ?? 0)); }
const agg = new Map();
let total = 0, idle = 0;
for (const [id, us] of self) {
  const cf = byId.get(id).callFrame;
  const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').slice(-2).join('/').split('?')[0]}:${cf.lineNumber + 1}`;
  if (cf.functionName === '(idle)' || cf.functionName === '(program)') { idle += us; continue; }
  total += us;
  agg.set(key, (agg.get(key) ?? 0) + us);
}
console.log('busy ms', (total / 1000).toFixed(1), 'idle/program ms', (idle / 1000).toFixed(1));
for (const [k, us] of [...agg].sort((a, b) => b[1] - a[1]).slice(0, n)) console.log((us / 1000).toFixed(2).padStart(8), k);

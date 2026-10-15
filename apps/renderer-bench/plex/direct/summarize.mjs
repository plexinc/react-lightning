import { readFileSync } from 'node:fs';
const all = readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => JSON.parse(l));
// Per (round, throttle, variant) keep the last attempt (the clean one, or the last try if all spiked).
const slot = new Map();
for (const r of all) slot.set(`${r.round}|${r.throttle}|${r.variant}`, r);
const rows = [...slot.values()];
const qs = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); if (!s.length) return null; const q = (p) => { const i = p * (s.length - 1), lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }; return [q(0.5), q(0.25), q(0.75), s.length]; };
const f = (x) => x == null ? '-' : Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2);
const M = [
  ['Renderer frame time, median (ms)', 'frameMsMedian'], ['Renderer frame time, p95 (ms)', 'frameMsP95'],
  ['Frames drawn', 'framesDrawn'], ['rAF callbacks (all)', 'framesAll'], ['Draw calls per frame, median', 'drawsPerFrameMedian'],
  ['Draw calls, total', 'drawsTotal'], ['Texture uploads', 'texUploads'], ['Main-thread task time (s)', 'taskSec'],
  ['Script time (s)', 'scriptSec'], ['Long tasks (count)', 'longTasks'], ['Long tasks (total ms)', 'longTaskMs'],
  ['Key-to-first-drawn-frame, Down (ms)', 'latDownMs'], ['Key-to-first-drawn-frame, Up (ms)', 'latUpMs'],
  ['JS heap after window, post-GC (MB)', 'heapMB1'], ['Elements', 'elements'], ['Renderer nodes', 'rendererNodes'],
  ['Load avg 1-min (start/end max)', 'loadMax'],
];
for (const r of rows) r.loadMax = Math.max(r.load0, r.load1);
for (const th of [1, 4]) {
  const g = (v) => rows.filter((r) => r.throttle === th && r.variant === v);
  const A = g('stock'), B = g('own'), C = g('direct');
  console.log(`\n${th}x  (n stock=${A.length}, compat=${B.length}, direct=${C.length}); median [IQR]\n| Metric | Stock | Compat | Direct |\n|---|---|---|---|`);
  const cell = (q) => (q ? `${f(q[0])} [${f(q[1])}-${f(q[2])}]` : '-');
  for (const [label, k] of M) {
    console.log(`| ${label} | ${cell(qs(A.map((r) => r[k])))} | ${cell(qs(B.map((r) => r[k])))} | ${cell(qs(C.map((r) => r[k])))} |`);
  }
}
console.log('\nattempts total', all.length, 'spiked kept', rows.filter((r) => r.loadMax > 20).length);

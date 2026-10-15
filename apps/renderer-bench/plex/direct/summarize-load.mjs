import { readFileSync } from 'node:fs';
const rows = readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const qs = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); if (!s.length) return null; const q = (p) => { const i = p * (s.length - 1), lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }; return [q(0.5), q(0.25), q(0.75), s.length]; };
const f = (x) => x == null ? '-' : Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2);
const cell = (q) => (q ? `${f(q[0])} [${f(q[1])}-${f(q[2])}]` : '-');
const M = [['Enter to Home text (ms)', 'enterToHomeTextMs'], ['Enter to settled (ms)', 'enterToSettledMs'], ['Main-thread task time (s)', 'taskSec'], ['Script time (s)', 'scriptSec'], ['Long tasks (count)', 'longTasks'], ['Long tasks (total ms)', 'longTaskMs'], ['Frames drawn', 'framesDrawn'], ['Renderer rAF ms total', 'rafMsDrawingTotal'], ['Texture uploads', 'texUploads'], ['JS heap post-GC (MB)', 'heapMB'], ['Load avg (max)', 'loadMax']];
for (const r of rows) r.loadMax = Math.max(r.load0, r.load1);
for (const th of [...new Set(rows.map((r) => r.throttle))]) {
  const g = (v) => rows.filter((r) => r.throttle === th && r.variant === v);
  const A = g('stock'), B = g('own'), C = g('direct');
  console.log(`\n${th}x Home load (n stock=${A.length}, compat=${B.length}, direct=${C.length}); median [IQR]\n| Metric | Stock | Compat | Direct |\n|---|---|---|---|`);
  for (const [label, k] of M) console.log(`| ${label} | ${cell(qs(A.map((r) => r[k])))} | ${cell(qs(B.map((r) => r[k])))} | ${cell(qs(C.map((r) => r[k])))} |`);
}

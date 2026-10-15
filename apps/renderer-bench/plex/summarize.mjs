import { readFileSync } from 'node:fs';
const rows = readFileSync(process.argv[2] ?? 'measure.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const med = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const iqr = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; return `${q(0.25).toFixed(1)}-${q(0.75).toFixed(1)}`; };
const metrics = [
  ['renderer frame median ms (drawing frames)', 'frameMsMedian'],
  ['renderer frame p95 ms', 'frameMsP95'],
  ['renderer rAF ms total (drawing frames)', 'rafMsDrawingTotal'],
  ['all rAF callbacks ms total', 'rafMsTotal'],
  ['frames drawn', 'framesDrawn'],
  ['draw calls per frame median', 'drawsPerFrameMedian'],
  ['draw calls per frame p95', 'drawsPerFrameP95'],
  ['texture uploads', 'texUploads'],
  ['main-thread task s (TaskDuration)', 'taskSec'],
  ['script s (ScriptDuration)', 'scriptSec'],
  ['JS heap after GC MB (Home, before)', 'heapMB0'],
  ['JS heap after GC MB (after scroll)', 'heapMB1'],
  ['renderer nodes', 'nodes1'],
];
const groups = {};
for (const r of rows) (groups[`${r.throttle}x ${r.variant}`] ??= []).push(r);
const cols = ['4x stock', '4x compat', '6x stock', '6x compat'].filter((c) => groups[c]);
console.log('metric'.padEnd(44) + cols.map((c) => `${c} (n=${groups[c].length})`.padEnd(26)).join(''));
for (const [label, key] of metrics) {
  console.log(label.padEnd(44) + cols.map((c) => { const xs = groups[c].map((r) => r[key]); const m = med(xs); return `${m == null ? '-' : m.toFixed(m < 10 ? 2 : 1)} [${iqr(xs)}]`.padEnd(26); }).join(''));
}
console.log('\nload averages:', [...new Set(rows.map((r) => r.uptime.split('load averages: ')[1]))].join(' / '));

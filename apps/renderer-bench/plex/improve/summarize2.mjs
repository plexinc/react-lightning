import { readFileSync } from 'node:fs';
const [file, ...cols] = process.argv.slice(2);
const rows = readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const med = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const rng = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? `${s[0].toFixed(1)}-${s[s.length - 1].toFixed(1)}` : '-'; };
const metrics = [
  ['renderer frame median ms', 'frameMsMedian'], ['renderer frame p95 ms', 'frameMsP95'],
  ['renderer rAF ms total (drawing)', 'rafMsDrawingTotal'], ['frames drawn', 'framesDrawn'],
  ['draw calls/frame median', 'drawsPerFrameMedian'], ['draw calls/frame p95', 'drawsPerFrameP95'],
  ['texture uploads', 'texUploads'], ['text rasters', 'textRasters'],
  ['texture MB at Home', 'texMemMB0'], ['texture MB after scroll', 'texMemMB1'],
  ['main-thread task s', 'taskSec'], ['script s', 'scriptSec'],
  ['JS heap MB before', 'heapMB0'], ['JS heap MB after', 'heapMB1'],
];
const groups = {};
for (const r of rows) (groups[`${r.throttle}x ${r.variant}`] ??= []).push(r);
const keys = cols.length ? cols : Object.keys(groups);
console.log('| Metric | ' + keys.map((k) => `${k} (n=${groups[k]?.length ?? 0})`).join(' | ') + ' |');
console.log('|' + ' --- |'.repeat(keys.length + 1));
for (const [label, key] of metrics) console.log(`| ${label} | ` + keys.map((k) => { const xs = (groups[k] ?? []).map((r) => r[key]); const m = med(xs); return m == null ? '-' : `${m.toFixed(m < 10 ? 2 : 1)} [${rng(xs)}]`; }).join(' | ') + ' |');

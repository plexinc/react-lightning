// node summarize.mjs results.jsonl -> median [p25..p75] per variant x throttle
import { readFileSync } from 'node:fs';

const rows = readFileSync(process.argv[2], 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((r) => !r.meta);

const q = (xs, p) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const i = p * (s.length - 1);
  const lo = Math.floor(i);
  return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo);
};
const fmt = (xs, d = 1) =>
  `${q(xs, 0.5).toFixed(d)} [${q(xs, 0.25).toFixed(d)}-${q(xs, 0.75).toFixed(d)}]`;

const metrics = [
  ['mount: commit ms', (r) => r.commitMs],
  ['mount: first frame ms', (r) => r.firstFrameMs],
  ['mount: settled ms', (r) => r.settleMs],
  ['mount: main-thread task ms', (r) => r.mountTaskMs],
  ['mount: script ms', (r) => r.mountScriptMs],
  ['mount: texture uploads', (r) => r.mountUploads, 0],
  ['heap delta after mount KB', (r) => r.heapDelta / 1024, 0],
  ['texture bytes MB', (r) => r.info_textureBytes / 1048576],
  ['steps: renderer frame (rAF) median ms', (r) => r.steps.rafMedian, 2],
  ['steps: renderer frame (rAF) p95 ms', (r) => r.steps.rafP95, 2],
  ['steps: rAF total ms per step', (r) => r.steps.rafTotal / r.steps.steps, 2],
  ['steps: script ms per step', (r) => r.steps.scriptMsPerStep],
  ['steps: task ms per step', (r) => r.steps.taskMsPerStep],
  ['steps: drawing frames', (r) => r.steps.drawingFrames, 0],
  ['steps: rAF callbacks', (r) => r.steps.frames, 0],
  ['steps: draw calls per frame', (r) => r.steps.drawsPerFrame, 0],
  ['steps: texture uploads total', (r) => r.steps.uploads, 0],
  ['steps: key->frame latency median ms', (r) => r.steps.latMedian],
  ['steps: key->frame latency p95 ms', (r) => r.steps.latP95],
  ['burst: rAF median ms', (r) => r.burst.rafMedian, 2],
  ['burst: rAF p95 ms', (r) => r.burst.rafP95, 2],
  ['burst: script ms per step', (r) => r.burst.scriptMsPerStep],
  ['burst: key->frame latency median ms', (r) => r.burst.latMedian],
  ['burst: key->frame latency p95 ms', (r) => r.burst.latP95],
];

const throttles = [...new Set(rows.map((r) => r.throttle))].sort((a, b) => a - b);

for (const t of throttles) {
  const cur = rows.filter((r) => r.throttle === t && r.variant === 'current');
  const mvp = rows.filter((r) => r.throttle === t && r.variant === 'mvp');
  console.log(`\nCPU throttle ${t}x (n=${cur.length}/${mvp.length})`);
  console.log(`${'metric'.padEnd(42)} ${'current'.padEnd(26)} ${'mvp'.padEnd(26)} ratio`);
  for (const [name, f, d = 1] of metrics) {
    const a = cur.map(f);
    const b = mvp.map(f);
    const ratio = q(a, 0.5) / q(b, 0.5);
    console.log(
      `${name.padEnd(42)} ${fmt(a, d).padEnd(26)} ${fmt(b, d).padEnd(26)} ${Number.isFinite(ratio) ? ratio.toFixed(2) : ''}`,
    );
  }
}

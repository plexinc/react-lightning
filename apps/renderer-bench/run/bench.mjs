import { execSync } from 'node:child_process';
// node bench.mjs <rounds> <throttles> <outfile>
// Alternates current/mvp within each round, in a fresh tab each time.
import { appendFileSync, readFileSync } from 'node:fs';

import { APP, connect, sleep } from './cdp.mjs';

const [roundsArg = '7', throttlesArg = '1,4,6', out = 'results.jsonl'] = process.argv.slice(2);
const ROUNDS = Number(roundsArg);
const THROTTLES = throttlesArg.split(',').map(Number);
const probe = readFileSync(new URL('../src/probe.js', import.meta.url), 'utf8');
const keydownProbe = `window.addEventListener('keydown', (e) => (window.__probe.keys ??= []).push(performance.now()), true);`;

const STEPS = [
  ...Array(6).fill('ArrowRight'),
  'ArrowDown',
  ...Array(3).fill('ArrowRight'),
  'ArrowDown',
  'ArrowDown',
  ...Array(2).fill('ArrowLeft'),
  'ArrowUp',
  ...Array(4).fill('ArrowRight'),
  'ArrowDown',
];
const BURST = Array(10).fill('ArrowRight');

const q = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))];
};
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

async function metrics(c) {
  const { metrics } = await c.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
}

async function gcHeap(c) {
  await c.send('HeapProfiler.collectGarbage');
  await sleep(100);
  await c.send('HeapProfiler.collectGarbage');
  return (await metrics(c)).JSHeapUsedSize;
}

async function waitQuiet(c, quietMs, cap) {
  const t0 = Date.now();
  while (Date.now() - t0 < cap) {
    const idle = await c.evaluate(
      `(() => { const f = __probe.frames; let last = 0; for (let i = f.length - 1; i >= 0; i--) { if (f[i][2] > 0) { last = f[i][0]; break; } } return performance.now() - last; })()`,
    );
    if (idle > quietMs) return true;
    await sleep(100);
  }
  return false;
}

async function sequence(c, keys, spacing) {
  await c.evaluate(
    `__probe.frames = []; __probe.keys = []; __focus = []; __probe.gl.draw = 0; __probe.gl.tex = 0; __probe.gl.sub = 0; __probe.gl.buf = 0; true`,
  );
  const m0 = await metrics(c);
  const start = Date.now();
  for (let i = 0; i < keys.length; i++) {
    const wait = start + i * spacing - Date.now();
    if (wait > 0) await sleep(wait);
    c.key(keys[i]);
  }
  await waitQuiet(c, 600, 15000);
  const m1 = await metrics(c);
  const data = await c.evaluate(
    `({ frames: __probe.frames, keys: __probe.keys ?? [], focus: __focus ?? [], gl: __probe.gl })`,
  );
  const frames = data.frames;
  const drawing = frames.filter((f) => f[2] > 0);
  // Key -> end of the first drawing frame after the focus commit for that key.
  const lat = [];
  for (const k of data.keys) {
    const f = data.focus.find((x) => x[0] >= k);
    if (!f) continue;
    const fr = drawing.find((x) => x[0] >= f[0]);
    if (fr) lat.push(fr[0] + fr[1] - k);
  }
  return {
    steps: keys.length,
    keysSeen: data.keys.length,
    focusSeen: data.focus.length,
    frames: frames.length,
    drawingFrames: drawing.length,
    rafMedian: q(
      drawing.map((f) => f[1]),
      0.5,
    ),
    rafP95: q(
      drawing.map((f) => f[1]),
      0.95,
    ),
    rafTotal: sum(frames.map((f) => f[1])),
    drawsPerFrame: q(
      drawing.map((f) => f[2]),
      0.5,
    ),
    uploads: data.gl.tex + data.gl.sub,
    bufferUploads: data.gl.buf,
    taskMsPerStep: ((m1.TaskDuration - m0.TaskDuration) * 1000) / keys.length,
    scriptMsPerStep: ((m1.ScriptDuration - m0.ScriptDuration) * 1000) / keys.length,
    latMedian: q(lat, 0.5),
    latP95: q(lat, 0.95),
  };
}

async function runOne(variant, throttle) {
  const c = await connect();
  try {
    await c.send('Page.addScriptToEvaluateOnNewDocument', { source: probe + keydownProbe });
    await c.send('HeapProfiler.enable');
    await c.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    await c.send('Page.navigate', { url: `${APP}/${variant}.html` });
    for (let i = 0; i < 300 && !(await c.evaluate('!!window.__benchReady').catch(() => false)); i++)
      await sleep(50);
    await waitQuiet(c, 500, 10000);
    const heap0 = await gcHeap(c);
    const m0 = await metrics(c);
    await c.evaluate(
      `__probe.frames = []; __probe.gl.tex = 0; __probe.gl.sub = 0; __probe.gl.draw = 0; true`,
    );
    const mount = await c.evaluate('__bench.mount()');
    await waitQuiet(c, 1000, 30000);
    const m1 = await metrics(c);
    const mountFrames = await c.evaluate(
      `(() => { const f = __probe.frames.filter(x => x[2] > 0); return { n: f.length, settle: f.length ? f[f.length-1][0] + f[f.length-1][1] : 0, uploads: __probe.gl.tex + __probe.gl.sub, origin: f.length ? f[0][0] : 0 }; })()`,
    );
    const tMountStart = await c.evaluate(
      `(__probe.frames.find(x => x[2] > 0) ?? [0])[0] - ${mount.firstFrameMs}`,
    );
    const heap1 = await gcHeap(c);
    const info = await c.evaluate('__bench.info()');
    const steps = await sequence(c, STEPS, 300);
    const burst = await sequence(c, BURST, 70);
    return {
      variant,
      throttle,
      commitMs: mount.commitMs,
      firstFrameMs: mount.firstFrameMs,
      settleMs: mountFrames.settle - tMountStart,
      mountTaskMs: (m1.TaskDuration - m0.TaskDuration) * 1000,
      mountScriptMs: (m1.ScriptDuration - m0.ScriptDuration) * 1000,
      mountUploads: mountFrames.uploads,
      heapBase: heap0,
      heapDelta: heap1 - heap0,
      ...Object.fromEntries(Object.entries(info).map(([k, v]) => [`info_${k}`, v])),
      steps,
      burst,
    };
  } finally {
    await c.close();
  }
}

const load = execSync('uptime').toString().trim();
console.log(load);
appendFileSync(
  out,
  `${JSON.stringify({ meta: true, load, at: new Date().toISOString(), rounds: ROUNDS, throttles: THROTTLES })}\n`,
);

for (let r = 0; r < ROUNDS; r++) {
  for (const throttle of THROTTLES) {
    const order = r % 2 === 0 ? ['current', 'mvp'] : ['mvp', 'current'];
    for (const v of order) {
      const res = await runOne(v, throttle);
      res.round = r;
      appendFileSync(out, `${JSON.stringify(res)}\n`);
      console.log(
        r,
        throttle,
        v,
        'commit',
        res.commitMs.toFixed(1),
        'first',
        res.firstFrameMs.toFixed(1),
        'raf',
        res.steps.rafMedian?.toFixed(2),
        'task/step',
        res.steps.taskMsPerStep.toFixed(1),
        'draws',
        res.steps.drawsPerFrame,
      );
    }
  }
}
console.log(execSync('uptime').toString().trim());

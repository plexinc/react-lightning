// node measure2.mjs <own|base|stock> <throttle> <out.jsonl>: Home Down x8 / Up x8 at 700 ms, like ../measure.mjs, plus texture and text stats.
import { appendFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { open, reachHome, waitIdle, steps, rendererStats, sleep } from './common.mjs';

const [variant, throttleArg = '4', out = 'measure2.jsonl'] = process.argv.slice(2);
const throttle = Number(throttleArg);
const c = await open(variant);
await c.send('Performance.enable', { timeDomain: 'timeTicks' });
const metrics = async () => Object.fromEntries((await c.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const gc = async () => { await c.send('HeapProfiler.collectGarbage'); await sleep(200); await c.send('HeapProfiler.collectGarbage'); };
const t = await reachHome(c, 6000);
await gc();
const heap0 = (await metrics()).JSHeapUsedSize;
const st0 = await c.evaluate(rendererStats);
await c.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await sleep(500);
await c.evaluate(`__probe.frames = []; __probe.gl.draw = 0; __probe.gl.tex = 0; __probe.gl.sub = 0; true`);
const m0 = await metrics();
const start = Date.now();
await steps(c, [...Array(8).fill('ArrowDown'), ...Array(8).fill('ArrowUp')], 700);
await waitIdle(c);
const m1 = await metrics();
const frames = await c.evaluate(`__probe.frames`);
const gl = await c.evaluate(`__probe.gl`);
const st1 = await c.evaluate(rendererStats);
await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
await gc();
const heap1 = (await metrics()).JSHeapUsedSize;
const drawing = frames.filter((f) => f[2] > 0);
const q = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const row = {
  variant, throttle, at: new Date().toISOString(), uptime: execSync('uptime').toString().trim(),
  framesAll: frames.length, framesDrawn: drawing.length,
  rafMsTotal: sum(frames.map((f) => f[1])), rafMsDrawingTotal: sum(drawing.map((f) => f[1])),
  frameMsMedian: q(drawing.map((f) => f[1]), 0.5), frameMsP95: q(drawing.map((f) => f[1]), 0.95),
  drawsPerFrameMedian: q(drawing.map((f) => f[2]), 0.5), drawsPerFrameP95: q(drawing.map((f) => f[2]), 0.95),
  texUploads: gl.tex + gl.sub,
  taskSec: m1.TaskDuration - m0.TaskDuration, scriptSec: m1.ScriptDuration - m0.ScriptDuration,
  wallSec: (Date.now() - start) / 1000,
  heapMB0: heap0 / 1048576, heapMB1: heap1 / 1048576,
  texMemMB0: st0.texMem / 1048576, texMemMB1: st1.texMem / 1048576,
  textRasters: st1.textRasters != null ? st1.textRasters - st0.textRasters : null,
  homeText: t.slice(0, 40),
};
appendFileSync(out, JSON.stringify(row) + '\n');
console.log(JSON.stringify(row));
await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: c.probeId });
c.close();

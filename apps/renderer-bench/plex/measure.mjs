// node measure.mjs <compat|stock> <throttle> <out.jsonl>
// Reload, pick profile, reach Home, then (throttled) press ArrowDown x8 / ArrowUp x8 700 ms apart.
import { appendFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { attach, sleep } from './cdp.mjs';

const [variant, throttleArg = '4', out = 'measure.jsonl'] = process.argv.slice(2);
const throttle = Number(throttleArg);
const port = variant === 'compat' ? 3421 : 3422;
process.env.CHROME_URL = variant === 'compat' ? 'http://127.0.0.1:9440' : 'http://127.0.0.1:9441';
globalThis.__noMetrics = true;
const origin = `http://localhost:${port}`;
const { attach: att } = await import('./cdp.mjs?' + variant);
const c = await att({ url: origin });
const probe = readFileSync(new URL('./probe.js', import.meta.url), 'utf8');
const { identifier } = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: probe });
await c.send('Performance.enable', { timeDomain: 'timeTicks' });
const metrics = async () => Object.fromEntries((await c.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const gc = async () => { await c.send('HeapProfiler.collectGarbage'); await sleep(200); await c.send('HeapProfiler.collectGarbage'); };
const texts = () => c.evaluate(`(() => { const out = []; const walk = (e) => { if (!e) return; if (e.isTextElement && e.node && e.node.text && e.visible) out.push(e.node.text); (e.children || []).forEach(walk); }; walk(window.rootElement); return out.join(' | '); })()`).catch(() => '');

await c.send('Page.navigate', { url: origin + '/' });
let t = '';
for (let i = 0; i < 160; i++) { await sleep(500); t = await texts(); if (t.includes("Who's watching")) break; }
await sleep(1500);
await c.key('Enter');
for (let i = 0; i < 160; i++) { await sleep(500); t = await texts(); if (t.includes('For You') && t.includes('Continue Watching')) break; }
if (!t.includes('Continue Watching')) { console.error('no home', t.slice(0, 200)); process.exit(1); }
await sleep(6000);

const nodesExpr = `(() => { const r = window.__compatRenderer ?? window.rootElement._renderer; let n = 0; const walk = (x) => { n++; for (const ch of x.children) walk(ch); }; walk(r.root); return n; })()`;
const nodes0 = await c.evaluate(nodesExpr);
await gc();
const heap0 = (await metrics()).JSHeapUsedSize;
await c.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await sleep(500);
await c.evaluate(`__probe.frames = []; __probe.gl.draw = 0; __probe.gl.tex = 0; __probe.gl.sub = 0; true`);
const m0 = await metrics();
const keys = [...Array(8).fill('ArrowDown'), ...Array(8).fill('ArrowUp')];
const start = Date.now();
for (let i = 0; i < keys.length; i++) {
  const wait = start + i * 700 - Date.now();
  if (wait > 0) await sleep(wait);
  await c.key(keys[i]);
}
// Settle: wait until no drawing frame for 1.5 s (cap 20 s).
const t1 = Date.now();
while (Date.now() - t1 < 20000) {
  const idle = await c.evaluate(`(() => { const f = __probe.frames; for (let i = f.length - 1; i >= 0; i--) if (f[i][2] > 0) return performance.now() - f[i][0]; return 1e9; })()`);
  if (idle > 1500) break;
  await sleep(250);
}
const m1 = await metrics();
const frames = await c.evaluate(`__probe.frames`);
const gl = await c.evaluate(`__probe.gl`);
await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const nodes1 = await c.evaluate(nodesExpr);
await gc();
const heap1 = (await metrics()).JSHeapUsedSize;
await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
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
  layoutSec: m1.LayoutDuration - m0.LayoutDuration, wallSec: (Date.now() - start) / 1000,
  heapMB0: heap0 / 1048576, heapMB1: heap1 / 1048576, nodes0, nodes1,
  homeText: t.slice(0, 60),
};
appendFileSync(out, JSON.stringify(row) + '\n');
console.log(JSON.stringify(row));
c.close();

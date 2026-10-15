// node bench.mjs <stock|own> <throttle> <out.jsonl>
// Reload, pick profile, reach Home, settle (3 s without a drawing frame or long task), apply throttle,
// then Down, 3 s, Up, 3 s. Metrics cover that window only.
import { appendFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { attach, sleep } from './cdp.mjs';

const [variant, throttleArg = '1', out = 'results.jsonl'] = process.argv.slice(2);
const throttle = Number(throttleArg);
const origin = process.env.ORIGIN ?? 'http://localhost:3491';
globalThis.__noMetrics = true;
const c = await attach({ url: origin });
const probe = readFileSync(new URL('./probe.js', import.meta.url), 'utf8');
const { identifier } = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: probe });
await c.send('Performance.enable', { timeDomain: 'timeTicks' });
await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const metrics = async () => Object.fromEntries((await c.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const gc = async () => { await c.send('HeapProfiler.collectGarbage'); await sleep(200); await c.send('HeapProfiler.collectGarbage'); };
const texts = () => c.evaluate(`(() => { const out = []; const walk = (e) => { if (!e) return; if (e.isTextElement && e.node && e.node.text && e.visible) out.push(e.node.text); (e.children || []).forEach(walk); }; walk(window.rootElement); return out.join(' | '); })()`).catch(() => '');
const up0 = execSync('uptime').toString().trim();
const t0 = Date.now();
await c.send('Page.navigate', { url: origin + '/' });
c.startTicker();
let t = '';
for (let i = 0; i < 240; i++) { await sleep(500); t = await texts(); if (t.includes("Who's watching")) break; }
if (!t.includes("Who's watching")) { console.error('no profile picker', t.slice(0, 200)); process.exit(1); }
await sleep(1500);
await c.key('Enter');
for (let i = 0; i < 240; i++) { await sleep(500); t = await texts(); if (t.includes('For You') && t.includes('Continue Watching')) break; }
if (!t.includes('Continue Watching')) { console.error('no home', t.slice(0, 200)); process.exit(1); }
const homeAt = Date.now();
const idleExpr = `(() => { const now = performance.now(); let lastDraw = 0, lastLt = 0; for (const f of __probe.frames) if (f[2] > 0) lastDraw = f[0] + f[1]; for (const l of __probe.lt) lastLt = Math.max(lastLt, l[0] + l[1]); return now - Math.max(lastDraw, lastLt); })()`;
const settle = async (ms, cap) => { const s = Date.now(); while (Date.now() - s < cap) { if ((await c.evaluate(idleExpr)) > ms) return (Date.now() - s) / 1000; await sleep(250); } return -1; };
const settleSec = await settle(3000, 60000);
await c.send('Emulation.setCPUThrottlingRate', { rate: throttle });
const settle2Sec = throttle > 1 ? await settle(1500, 15000) : 0;
await c.evaluate(`__probe.frames = []; __probe.lt = []; __probe.keys = []; __probe.gl.draw = 0; __probe.gl.tex = 0; __probe.gl.sub = 0; true`);
const m0 = await metrics();
const w0 = await c.evaluate('performance.now()');
await c.key('ArrowDown');
await sleep(3000);
await c.key('ArrowUp');
await sleep(3000);
const m1 = await metrics();
const w1 = await c.evaluate('performance.now()');
const frames = await c.evaluate(`__probe.frames`);
const gl = await c.evaluate(`__probe.gl`);
const lt = await c.evaluate(`__probe.lt`);
const keys = await c.evaluate(`__probe.keys`);
const tAfter = await texts();
const counts = await c.evaluate(`(() => { let el = 0, nodes = 0; const we = (e) => { if (!e) return; el++; (e.children || []).forEach(we); }; we(window.rootElement); const root = window.__compatRenderer?.root ?? window.rootElement?._renderer?.root; const wn = (n) => { if (!n) return; nodes++; const k = n._kids ?? n.children ?? []; for (let i = 0; i < k.length; i++) wn(k[i]); }; wn(root); return { el, nodes }; })()`).catch(() => ({}));
await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
await gc();
const heap1 = (await metrics()).JSHeapUsedSize;
c.stopTicker();
await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
const up1 = execSync('uptime').toString().trim();
const drawing = frames.filter((f) => f[2] > 0);
const q = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const lat = (k) => { if (!k) return null; const f = drawing.find((f) => f[0] >= k[0]); return f ? f[0] + f[1] - k[0] : null; };
const kd = keys.find((k) => k[1] === 'ArrowDown'), ku = keys.find((k) => k[1] === 'ArrowUp');
const ltIn = lt.filter((l) => l[0] >= w0);
const la = (u) => Number(u.split('load averages: ')[1].split(' ')[0]);
const row = {
  variant, throttle, at: new Date().toISOString(), uptime0: up0, uptime1: up1, load0: la(up0), load1: la(up1),
  loadToHomeSec: (homeAt - t0) / 1000, settleSec, settle2Sec, windowSec: (w1 - w0) / 1000,
  framesAll: frames.length, framesDrawn: drawing.length,
  frameMsMedian: q(drawing.map((f) => f[1]), 0.5), frameMsP95: q(drawing.map((f) => f[1]), 0.95),
  rafMsDrawingTotal: sum(drawing.map((f) => f[1])),
  drawsPerFrameMedian: q(drawing.map((f) => f[2]), 0.5), drawsPerFrameP95: q(drawing.map((f) => f[2]), 0.95), drawsTotal: gl.draw,
  texUploads: gl.tex + gl.sub,
  taskSec: m1.TaskDuration - m0.TaskDuration, scriptSec: m1.ScriptDuration - m0.ScriptDuration,
  longTasks: ltIn.length, longTaskMs: sum(ltIn.map((l) => l[1])),
  latDownMs: lat(kd), latUpMs: lat(ku), keysSeen: keys.length,
  heapMB1: heap1 / 1048576, elements: counts.el, rendererNodes: counts.nodes, homeText: t.slice(0, 50), afterText: tAfter.slice(0, 80),
};
appendFileSync(out, JSON.stringify(row) + '\n');
console.log(JSON.stringify(row));
c.close();

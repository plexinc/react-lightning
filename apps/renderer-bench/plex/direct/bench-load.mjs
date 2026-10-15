// node bench-load.mjs <variant> <throttle> <out.jsonl>: profile pick -> Home settled (3 s without a
// drawing frame or long task), throttled from the Enter on the profile. Main-thread cost of mounting Home.
import { appendFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { attach, sleep } from './cdp.mjs';

const [variant, throttleArg = '1', out = 'load.jsonl'] = process.argv.slice(2);
const throttle = Number(throttleArg);
const origin = process.env.ORIGIN ?? 'http://localhost:3491';
globalThis.__noMetrics = true;
const c = await attach({ url: 'http://localhost' });
const probe = readFileSync(new URL('./probe.js', import.meta.url), 'utf8');
const { identifier } = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: probe });
await c.send('Performance.enable', { timeDomain: 'timeTicks' });
await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const metrics = async () => Object.fromEntries((await c.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const texts = () => c.evaluate(`(() => { const out = []; const walk = (e) => { if (!e) return; if (e.isTextElement && e.node && e.node.text && e.visible) out.push(e.node.text); (e.children || []).forEach(walk); }; walk(window.rootElement); return out.join(' | '); })()`).catch(() => '');
const up0 = execSync('uptime').toString().trim();
await c.send('Page.navigate', { url: origin + '/' });
c.startTicker();
let t = '';
for (let i = 0; i < 240; i++) { await sleep(500); t = await texts(); if (t.includes("Who's watching")) break; }
if (!t.includes("Who's watching")) { console.error('no profile picker'); process.exit(1); }
await sleep(3000);
await c.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await c.evaluate(`__probe.frames = []; __probe.lt = []; __probe.gl.draw = 0; __probe.gl.tex = 0; __probe.gl.sub = 0; true`);
const m0 = await metrics();
const w0 = await c.evaluate('performance.now()');
await c.key('Enter');
for (let i = 0; i < 480; i++) { await sleep(250); t = await texts(); if (t.includes('Continue Watching')) break; }
const homeAt = await c.evaluate('performance.now()');
const idleExpr = `(() => { const now = performance.now(); let lastDraw = 0, lastLt = 0; for (const f of __probe.frames) if (f[2] > 0) lastDraw = f[0] + f[1]; for (const l of __probe.lt) lastLt = Math.max(lastLt, l[0] + l[1]); return [now - Math.max(lastDraw, lastLt), Math.max(lastDraw, lastLt)]; })()`;
let settledAt = null;
for (let s = Date.now(); Date.now() - s < 90000; ) { const [idle, last] = await c.evaluate(idleExpr); if (idle > 3000) { settledAt = last; break; } await sleep(250); }
const m1 = await metrics();
const frames = await c.evaluate('__probe.frames');
const lt = await c.evaluate('__probe.lt');
const gl = await c.evaluate('__probe.gl');
await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
await c.send('HeapProfiler.collectGarbage'); await sleep(200); await c.send('HeapProfiler.collectGarbage');
const heap = (await metrics()).JSHeapUsedSize;
c.stopTicker();
await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
const up1 = execSync('uptime').toString().trim();
const la = (u) => Number(u.split('load averages: ')[1].split(' ')[0]);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const drawing = frames.filter((f) => f[2] > 0);
const row = {
  variant, throttle, at: new Date().toISOString(), load0: la(up0), load1: la(up1),
  enterToHomeTextMs: homeAt - w0, enterToSettledMs: settledAt ? settledAt - w0 : null,
  taskSec: m1.TaskDuration - m0.TaskDuration, scriptSec: m1.ScriptDuration - m0.ScriptDuration,
  layoutSec: m1.LayoutDuration - m0.LayoutDuration,
  longTasks: lt.filter((l) => l[0] >= w0).length, longTaskMs: sum(lt.filter((l) => l[0] >= w0).map((l) => l[1])),
  framesDrawn: drawing.length, rafMsDrawingTotal: sum(drawing.map((f) => f[1])), texUploads: gl.tex + gl.sub,
  heapMB: heap / 1048576,
};
appendFileSync(out, JSON.stringify(row) + '\n');
console.log(JSON.stringify(row));
c.close();

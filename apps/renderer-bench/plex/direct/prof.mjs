// node prof.mjs <label> <throttle> [reload=1]: (reload, pick profile,) settle on Home, CPU-profile Down/Up (100 us).
import { writeFileSync } from 'node:fs';
import { attach, sleep } from './cdp.mjs';
globalThis.__noMetrics = true;
const [label, th = '1', reload = '1'] = process.argv.slice(2);
const c = await attach({ url: 'http://localhost' });
const texts = () => c.evaluate(`(() => { const out = []; const walk = (e) => { if (!e) return; if (e.isTextElement && e.node && e.node.text && e.visible) out.push(e.node.text); (e.children || []).forEach(walk); }; walk(window.rootElement); return out.join(' | '); })()`).catch(() => '');
await c.send('Profiler.enable');
await c.send('Profiler.setSamplingInterval', { interval: 100 });
c.startTicker();
let t = '';
if (reload === '1') {
  await c.send('Page.navigate', { url: 'http://localhost:3491/' });
  for (let i = 0; i < 240; i++) { await sleep(500); t = await texts(); if (t.includes("Who's watching")) break; }
  await sleep(1500);
  await c.send('Profiler.start');
  await c.key('Enter');
  for (let i = 0; i < 240; i++) { await sleep(250); t = await texts(); if (t.includes('Continue Watching')) break; }
  await sleep(4000);
  const { profile } = await c.send('Profiler.stop');
  writeFileSync(`prof-${label}-load.cpuprofile`, JSON.stringify(profile));
}
await sleep(2000);
await c.send('Emulation.setCPUThrottlingRate', { rate: Number(th) });
await sleep(1500);
await c.send('Profiler.start');
await c.key('ArrowDown');
await sleep(3000);
await c.key('ArrowUp');
await sleep(3000);
const { profile } = await c.send('Profiler.stop');
await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
writeFileSync(`prof-${label}-nav.cpuprofile`, JSON.stringify(profile));
c.stopTicker(); c.close();
console.log('ok');

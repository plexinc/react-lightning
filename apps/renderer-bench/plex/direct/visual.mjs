// node visual.mjs <prefix>: reload, profile, Home at rest, Down (focus in a row), Right, Enter (detail page).
import { attach, sleep } from './cdp.mjs';
globalThis.__noMetrics = true;
const pre = process.argv[2];
const c = await attach({ url: 'http://localhost' });
const texts = () => c.evaluate(`(() => { const out = []; const walk = (e) => { if (!e) return; if (e.isTextElement && e.node && e.node.text && e.visible) out.push(e.node.text); (e.children || []).forEach(walk); }; walk(window.rootElement); return out.join(' | '); })()`).catch(() => '');
c.startTicker();
await c.send('Page.navigate', { url: 'http://localhost:3491/' });
let t = '';
for (let i = 0; i < 240; i++) { await sleep(500); t = await texts(); if (t.includes("Who's watching")) break; }
await sleep(1500);
await c.key('Enter');
for (let i = 0; i < 240; i++) { await sleep(250); t = await texts(); if (t.includes('Continue Watching')) break; }
await sleep(8000);
await c.shot(`${pre}-1-home.png`, 0.5);
const steps = (process.argv[3] ?? 'ArrowDown,ArrowRight,Enter').split(',');
for (let i = 0; i < steps.length; i++) {
  await c.key(steps[i]);
  await sleep(steps[i] === 'Enter' ? 7000 : 2500);
  await c.shot(`${pre}-${i + 2}-${steps[i]}.png`, 0.5);
}
console.log((await texts()).slice(0, 300));
c.stopTicker(); c.close();

// node signin.mjs <url>: open, press Sign In, print the link code.
import { attach, sleep } from './cdp.mjs';
globalThis.__noMetrics = true;
const c = await attach({});
await c.send('Page.navigate', { url: process.argv[2] });
c.startTicker();
const texts = () => c.evaluate(`(() => { const out = []; const walk = (e) => { if (!e) return; if (e.isTextElement && e.node && e.node.text && e.visible) out.push(e.node.text); (e.children || []).forEach(walk); }; walk(window.rootElement); return out.join(' | '); })()`).catch(() => '');
let t = '';
for (let i = 0; i < 120; i++) { await sleep(500); t = await texts(); if (t.includes('Sign In') || t.includes("Who's watching")) break; }
if (t.includes("Who's watching")) { console.log('SIGNED-IN'); process.exit(0); }
await sleep(1500);
await c.key('Enter');
for (let i = 0; i < 40; i++) { await sleep(500); t = await texts(); if (t.includes('enter this code')) break; }
await sleep(1000); t = await texts();
const after = t.split('enter this code').at(-1) ?? '';
console.log(after.split('|').map((s) => s.trim()).filter((s) => s.length === 1).slice(0, 4).join(''));
c.stopTicker(); c.close();

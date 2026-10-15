// node home.mjs <origin>: reload, pick the first profile, wait for Home (For You), print state.
import { attach, sleep } from './cdp.mjs';
globalThis.__noMetrics = true;
const origin = process.argv[2];
const c = await attach({ url: origin });
const errs = [];
c.on('Runtime.exceptionThrown', (p) => errs.push((p.exceptionDetails.exception?.description ?? p.exceptionDetails.text).slice(0, 800)));
await c.send('Page.navigate', { url: origin + '/' });
c.startTicker();
const texts = () => c.evaluate(`(() => { const out = []; const walk = (e) => { if (!e) return; if (e.isTextElement && e.node && e.node.text && e.visible) out.push(e.node.text); (e.children || []).forEach(walk); }; walk(window.rootElement); return out.join(' | '); })()`).catch(() => '');
let t = '';
for (let i = 0; i < 120; i++) { await sleep(500); t = await texts(); if (t.includes("Who's watching")) break; }
await sleep(1500);
await c.key('Enter');
for (let i = 0; i < 120; i++) { await sleep(500); t = await texts(); if (t.includes('For You') && t.includes('Continue Watching')) break; }
await sleep(Number(process.env.SETTLE ?? 4000));
console.log(t.slice(0, 200));
if (errs.length) console.log('EXCEPTIONS', errs.slice(0, 3));
c.stopTicker(); c.close();

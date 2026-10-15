// node keys.mjs <origin> <Key,Key,...> [waitMs] : press keys 600 ms apart, then print visible texts.
import { attach, sleep } from '../cdp.mjs';
globalThis.__noMetrics = true;
const [origin, keyList = '', wait = '3000', shotFile] = process.argv.slice(2);
const c = await attach({ url: origin });
c.startTicker();
for (const k of keyList.split(',').filter(Boolean)) { await c.key(k); await sleep(Number(process.env.GAP ?? 600)); }
await sleep(Number(wait));
const t = await c.evaluate(`(() => { const out = []; const walk = (e) => { if (!e) return; if (e.isTextElement && e.node && e.node.text && e.visible) out.push(e.node.text); (e.children || []).forEach(walk); }; walk(window.rootElement); return out.join(' | '); })()`).catch((e) => 'ERR ' + e.message);
console.log(t.slice(0, 1500));
if (shotFile) await c.shot(shotFile, Number(process.env.SCALE ?? 0.5));
c.stopTicker(); c.close();

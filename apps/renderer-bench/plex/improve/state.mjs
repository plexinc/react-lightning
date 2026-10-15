// node state.mjs <origin> [navigate] [shot.png]: print visible texts (and optionally navigate / screenshot).
import { attach, sleep } from '../cdp.mjs';
globalThis.__noMetrics = true;
const [origin, nav, shotFile] = process.argv.slice(2);
const c = await attach({ url: origin });
const errs = [];
c.on('Runtime.exceptionThrown', (p) => errs.push((p.exceptionDetails.exception?.description ?? p.exceptionDetails.text).slice(0, 400)));
if (nav === '1') { await c.send('Page.navigate', { url: origin + '/' }); }
c.startTicker();
const texts = () => c.evaluate(`(() => { const out = []; const walk = (e) => { if (!e) return; if (e.isTextElement && e.node && e.node.text && e.visible) out.push(e.node.text); (e.children || []).forEach(walk); }; walk(window.rootElement); return out.join(' | '); })()`).catch((e) => 'ERR ' + e.message);
await sleep(Number(process.env.WAIT ?? 8000));
console.log((await texts()).slice(0, 1500));
if (shotFile) await c.shot(shotFile, Number(process.env.SCALE ?? 0.5));
if (errs.length) console.log('EXCEPTIONS', errs.slice(0, 3));
c.stopTicker(); c.close();

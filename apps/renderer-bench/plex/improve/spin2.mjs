// node spin2.mjs <variant> <out.png> <keys>: slow network, press keys, wait for a visible spinner, then capture it.
import { open, sleep } from './common.mjs';
const [variant, out, keyList] = process.argv.slice(2);
const c = await open(variant, { probe: false });
c.startTicker();
await c.send('Network.enable');
await c.send('Network.emulateNetworkConditions', { offline: false, latency: 4000, downloadThroughput: -1, uploadThroughput: -1 });
for (const k of keyList.split(',').filter(Boolean)) { await c.key(k); await sleep(600); }
const q = `(() => { const out = []; const r = window.__compatRenderer?.root ?? window.rootElement._renderer.root; const walk = (x) => { const t = x._shader?.shaderType ?? x.shader?.shaderKey; let a = 1; for (let p = x; p; p = p._parent ?? p.parent) a *= p._alpha ?? p.alpha; if (t === 'SpinnerArc' && a > 0.9) { const chain = []; for (let p = x; p; p = p._parent ?? p.parent) chain.push([p._alpha ?? p.alpha, +(p._worldAlpha ?? p.worldAlpha).toFixed(2), p._clipping ?? p.clipping ? 'C' : '', p.renderState, Math.round(p._wy ?? p.globalTransform?.ty ?? 0), p._h ?? p.h].join('/')); out.push({ chain: chain.join(' < ') }); } if (false) out.push({ kind: x._shader?.kind, rs: x.renderState, a, wa: x._wa, wb: x._wb, w: x._w ?? x.w, rot: x._rotation ?? x.rotation, y: x._wy ?? x.globalTransform?.ty }); x.children.forEach(walk); }; walk(r); return out; })()`;
let found = null;
for (let i = 0; i < 100 && !found; i++) { const r = await c.evaluate(q); if (r.length) found = r; else await sleep(100); }
console.log(JSON.stringify(found));
if (found) await c.shot(out, 1);
await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
c.stopTicker(); c.close();

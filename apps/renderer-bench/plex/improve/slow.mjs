// node slow.mjs <variant> <outDir> <name> <keys> <latencyMs> <waitMs>: press keys with slow network, capture while loading.
import { open, sleep } from './common.mjs';
const [variant, dir, name, keyList, latency = '3000', wait = '1500'] = process.argv.slice(2);
const c = await open(variant, { probe: false });
c.startTicker();
await c.send('Network.enable');
await c.send('Network.emulateNetworkConditions', { offline: false, latency: Number(latency), downloadThroughput: -1, uploadThroughput: -1 });
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
for (const k of keyList.split(',').filter(Boolean)) { await c.key(k); await sleep(600); }
await sleep(Number(wait));
await c.shot(`${dir}/${name}-${variant}.png`, 1);
const sp = await c.evaluate(`(() => { const out = []; const r = window.__compatRenderer?.root ?? window.rootElement._renderer.root; const walk = (x) => { const t = x._shader?.shaderType ?? x.shader?.shaderKey; const a = x._worldAlpha ?? x.worldAlpha; if (t === 'SpinnerArc' && a > 0) out.push({ x: x._wx ?? x.globalTransform?.tx, y: x._wy ?? x.globalTransform?.ty, w: x._w ?? x.w, h: x._h ?? x.h, a, props: x._shader?.props ?? x.shader?.resolvedProps }); x.children.forEach(walk); }; walk(r); return JSON.stringify(out); })()`);
console.log('spinners visible', sp);
await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await c.send('Network.setCacheDisabled', { cacheDisabled: false });
c.stopTicker(); c.close();

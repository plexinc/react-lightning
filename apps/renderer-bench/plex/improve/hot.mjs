// node hot.mjs a.cpuprofile [b.cpuprofile]: renderer-side self time (ms) by bucket, side by side.
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
const NATIVE = new Set(['texImage2D', 'texSubImage2D', 'bufferSubData', 'drawElements', 'bindTexture', 'activeTexture', 'clear', 'fillText', 'measureText', 'createImageBitmap', 'scissor', 'enable', 'disable', 'createTexture', 'deleteTexture', 'texParameteri', 'pixelStorei', 'uniform2f', 'useProgram', 'getContext', 'clearRect']);
const tables = files.map((f) => {
  const p = JSON.parse(readFileSync(f, 'utf8'));
  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  const t = new Map();
  let total = 0, idle = 0;
  for (let i = 0; i < p.samples.length; i++) {
    const n = byId.get(p.samples[i]);
    const dt = (p.timeDeltas[i + 1] ?? p.timeDeltas[i]) / 1000;
    const cf = n.callFrame;
    if (cf.functionName === '(idle)') { idle += dt; continue; }
    total += dt;
    let k = null;
    if (cf.url.includes('/packages/renderer/src/')) k = (cf.url.split('/packages/renderer/src/')[1].split('?')[0]) + ' ' + (cf.functionName || '(anon)');
    else if (!cf.url && NATIVE.has(cf.functionName)) k = 'native ' + cf.functionName;
    if (k) t.set(k, (t.get(k) ?? 0) + dt);
  }
  return { t, total, sum: [...t.values()].reduce((a, b) => a + b, 0) };
});
const keys = [...new Set(tables.flatMap((x) => [...x.t.keys()]))].sort((a, b) => (tables.at(-1).t.get(b) ?? 0) + (tables[0].t.get(b) ?? 0) - (tables.at(-1).t.get(a) ?? 0) - (tables[0].t.get(a) ?? 0));
console.log('busy ms: ' + tables.map((x) => x.total.toFixed(0)).join(' / ') + '   renderer total ms: ' + tables.map((x) => x.sum.toFixed(1)).join(' / '));
for (const k of keys.slice(0, Number(process.env.TOP ?? 25))) console.log(tables.map((x) => (x.t.get(k) ?? 0).toFixed(1).padStart(8)).join('') + '  ' + k);

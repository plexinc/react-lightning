// node attribute.mjs <file.cpuprofile> [top]: self time by function and by bucket.
import { readFileSync } from 'node:fs';
const [file, topArg = '40'] = process.argv.slice(2);
const p = JSON.parse(readFileSync(file, 'utf8'));
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const self = new Map();
const dts = p.timeDeltas;
for (let i = 0; i < p.samples.length; i++) {
  const n = byId.get(p.samples[i]);
  const dt = (dts[i + 1] ?? dts[i]) / 1000;
  self.set(n.id, (self.get(n.id) ?? 0) + dt);
}
const fn = new Map();
const bucket = new Map();
const bucketOf = (cf) => {
  const u = cf.url || '';
  if (!u) return cf.functionName ? `(${cf.functionName})` : '(native)';
  if (u.includes('/packages/renderer/src/compat/')) return 'renderer:compat/' + u.split('/compat/')[1].split('?')[0];
  if (u.includes('/packages/renderer/src/')) return 'renderer:' + u.split('/packages/renderer/src/')[1].split('?')[0];
  if (u.includes('@lightningjs')) return 'lightningjs';
  if (u.includes('react-lightning-plugin-flexbox') || u.includes('yoga')) return 'flexbox/yoga';
  if (u.includes('react-lightning')) return 'react-lightning*';
  if (u.includes('react-reconciler') || u.includes('react-dom') || /\/react\b|react_jsx|chunk-.*react/.test(u)) return 'react';
  if (u.includes('reanimated')) return 'reanimated';
  if (u.includes('node_modules/.vite')) return 'deps:' + u.split('/deps/')[1]?.split('?')[0].slice(0, 40);
  return 'app';
};
let total = 0;
for (const [id, t] of self) {
  const n = byId.get(id);
  const cf = n.callFrame;
  const k = `${cf.functionName || '(anon)'} ${bucketOf(cf)}:${cf.lineNumber + 1}`;
  fn.set(k, (fn.get(k) ?? 0) + t);
  const b = bucketOf(cf);
  bucket.set(b, (bucket.get(b) ?? 0) + t);
  total += t;
}
console.log(`total ${total.toFixed(0)} ms, idle ${(bucket.get('(idle)') ?? 0).toFixed(0)}, program ${(bucket.get('(program)') ?? 0).toFixed(0)}, gc ${(bucket.get('(garbage collector)') ?? 0).toFixed(0)}`);
console.log('-- buckets');
for (const [k, t] of [...bucket].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(t.toFixed(1).padStart(9), k);
console.log('-- functions');
for (const [k, t] of [...fn].sort((a, b) => b[1] - a[1]).slice(0, Number(topArg))) console.log(t.toFixed(1).padStart(9), k);

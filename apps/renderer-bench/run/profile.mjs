// node profile.mjs <variant> <throttle> -> top self-time functions during the step sequence
import { readFileSync } from 'node:fs';

import { APP, connect, sleep } from './cdp.mjs';

const [variant = 'mvp', throttle = '1'] = process.argv.slice(2);
const probe = readFileSync(new URL('../src/probe.js', import.meta.url), 'utf8');
const c = await connect();

await c.send('Page.addScriptToEvaluateOnNewDocument', { source: probe });
await c.send('Emulation.setCPUThrottlingRate', { rate: Number(throttle) });
await c.send('Page.navigate', { url: `${APP}/${variant}.html` });
for (let i = 0; i < 200 && !(await c.evaluate('!!window.__benchReady').catch(() => false)); i++)
  await sleep(50);
await c.evaluate('__bench.mount()');
await sleep(3000);
await c.send('Profiler.enable');
await c.send('Profiler.setSamplingInterval', { interval: 100 });
await c.send('Profiler.start');

const keys = [
  ...Array(6).fill('ArrowRight'),
  'ArrowDown',
  ...Array(3).fill('ArrowRight'),
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowLeft',
  'ArrowUp',
  ...Array(4).fill('ArrowRight'),
  'ArrowDown',
];

for (const k of keys) {
  c.key(k);
  await sleep(300);
}
await sleep(1000);

const { profile } = await c.send('Profiler.stop');
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas;

for (let i = 0; i < profile.samples.length; i++) {
  const n = byId.get(profile.samples[i]);
  const f = n.callFrame;
  const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}`;

  self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0) / 1000);
}

const total = [...self.values()].reduce((a, b) => a + b, 0);
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);

console.log(`${variant} ${throttle}x total sampled ${total.toFixed(0)} ms`);
for (const [k, v] of top) console.log(`${v.toFixed(1).padStart(8)} ms  ${k}`);
await c.close();

// Heap objects allocated by mounting the scene: snapshot before/after, diff by constructor.
import { readFileSync } from 'node:fs';

import { APP, connect, sleep } from './cdp.mjs';

const variant = process.argv[2] ?? 'mvp';
const probe = readFileSync(new URL('../src/probe.js', import.meta.url), 'utf8');

async function snapshot(c) {
  await c.send('HeapProfiler.collectGarbage');
  await sleep(100);

  const chunks = [];
  const onChunk = (p) => chunks.push(p.chunk);

  c.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await c.send('HeapProfiler.takeHeapSnapshot', {
    reportProgress: false,
    captureNumericValue: false,
  });

  const snap = JSON.parse(chunks.join(''));
  chunks.length = 0;

  const fields = snap.snapshot.meta.node_fields;
  const types = snap.snapshot.meta.node_types[0];
  const nf = fields.length;
  const ti = fields.indexOf('type');
  const ni = fields.indexOf('name');
  const byName = new Map();
  let total = 0;

  for (let i = 0; i < snap.nodes.length; i += nf) {
    const type = types[snap.nodes[i + ti]];

    if (
      type === 'synthetic' ||
      type === 'code' ||
      type === 'hidden' ||
      type === 'concatenated string' ||
      type === 'sliced string'
    )
      continue;

    const key = type === 'object' ? snap.strings[snap.nodes[i + ni]] : `(${type})`;

    byName.set(key, (byName.get(key) ?? 0) + 1);
    total++;
  }

  return { total, byName };
}

const c = await connect();

await c.send('Page.addScriptToEvaluateOnNewDocument', { source: probe });
await c.send('HeapProfiler.enable');
await c.send('Page.navigate', { url: `${APP}/${variant}.html` });
for (let i = 0; i < 200 && !(await c.evaluate('!!window.__benchReady').catch(() => false)); i++)
  await sleep(50);
await sleep(1500);

const a = await snapshot(c);

await c.evaluate('__bench.mount()');
await sleep(4000);
await c.evaluate('__probe.frames.length = 0');

const b = await snapshot(c);
const info = await c.evaluate('__bench.info()');
const diff = [];

for (const [k, v] of b.byName) {
  const d = v - (a.byName.get(k) ?? 0);

  if (d > 0) diff.push([k, d]);
}

diff.sort((x, y) => y[1] - x[1]);
console.log(
  JSON.stringify({
    variant,
    elements: info.elements,
    totalBefore: a.total,
    totalAfter: b.total,
    delta: b.total - a.total,
    perElement: (b.total - a.total) / info.elements,
    top: diff.slice(0, 25),
  }),
);
await c.close();

import { readFileSync, writeFileSync } from 'node:fs';

import { APP, connect, sleep } from './cdp.mjs';

const variant = process.argv[2] ?? 'mvp';
const out = process.argv[3] ?? `/tmp/${variant}.png`;
const c = await connect();
const errors = [];

c.on(
  'Runtime.consoleAPICalled',
  (p) => p.type === 'error' && errors.push(p.args.map((a) => a.value ?? a.description).join(' ')),
);
c.on('Runtime.exceptionThrown', (p) =>
  errors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text),
);
await c.send('Page.addScriptToEvaluateOnNewDocument', {
  source: readFileSync(new URL('../src/probe.js', import.meta.url), 'utf8'),
});
c.startTicker();
await c.send('Page.navigate', { url: `${APP}/${variant}.html` });
for (let i = 0; i < 100 && !(await c.evaluate('!!window.__benchReady').catch(() => false)); i++)
  await sleep(100);
console.log(
  'gl',
  await c.evaluate(
    `(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); })()`,
  ),
);
console.log('mount', await c.evaluate('__bench.mount()'));
await sleep(2500);
for (const k of (process.argv[4] ?? '').split(',').filter(Boolean)) {
  await c.key(k);
  await sleep(300);
}
await sleep(500);
console.log('info', await c.evaluate('__bench.info()'));
const shot = await c.send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log('errors', errors.slice(0, 10));
await c.close();

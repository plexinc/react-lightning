// node shots.mjs <variant> <outDir> <name> [keys] [gap]: press keys then capture the canvas at full size.
import { open, sleep } from './common.mjs';
const [variant, dir, name, keyList = '', gap = '700'] = process.argv.slice(2);
const c = await open(variant, { probe: false });
c.startTicker();
for (const k of keyList.split(',').filter(Boolean)) { if (k.startsWith('wait')) { await sleep(Number(k.slice(4))); continue; } await c.key(k); await sleep(Number(gap)); }
await sleep(Number(process.env.WAIT ?? 2500));
await c.shot(`${dir}/${name}-${variant}.png`, Number(process.env.SCALE ?? 1));
console.log((await c.texts()).slice(0, Number(process.env.TLEN ?? 200)));
c.stopTicker(); c.close();

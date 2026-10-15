// node ctxloss.mjs <variant> <dir>: capture, lose and restore the WebGL context, capture again.
import { open, sleep } from './common.mjs';
const [variant, dir] = process.argv.slice(2);
const c = await open(variant, { probe: false });
c.startTicker();
await c.shot(`${dir}/ctx-before-${variant}.png`, 1);
await c.evaluate(`(() => { const gl = document.querySelector('#app canvas').getContext('webgl'); window.__lc = gl.getExtension('WEBGL_lose_context'); window.__lc.loseContext(); return true; })()`);
await sleep(1000);
await c.key('ArrowRight');
await sleep(500);
await c.key('ArrowLeft');
await sleep(500);
await c.evaluate(`(() => { window.__lc.restoreContext(); return true; })()`);
await sleep(4000);
await c.shot(`${dir}/ctx-after-${variant}.png`, 1);
console.log(JSON.stringify(await c.evaluate(`(() => { const s = window.__compatRenderer?.stage; return s ? { lost: s.gl.isContextLost(), mem: s.textures.memoryUsed / 1048576, pages: s.textAtlas.pageCount, frames: s.stats.frames, draws: s.stats.drawCalls } : null; })()`)));
c.stopTicker(); c.close();

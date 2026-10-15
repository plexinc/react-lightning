// node gradtest.mjs <variant> <dir> <tag>: overlay test gradients (and other shader cases) on the current screen and capture.
import { open, sleep } from './common.mjs';
const [variant, dir, tag = 'grad'] = process.argv.slice(2);
const c = await open(variant, { probe: false });
c.startTicker();
await c.evaluate(`(() => {
  const r = window.__compatRenderer ?? window.rootElement._renderer;
  (window.__testNodes ?? []).forEach((n) => r.destroyNode ? r.destroyNode(n) : n.destroy());
  const mk = (x, y, w, h, shader, extra = {}) => r.createNode({ parent: r.root, x, y, w, h, color: 0xffffffff, zIndex: 9999, shader, ...extra });
  const g = (angle, radius) => r.createShader('LinearGradient', { colors: [0xff0000ff, 0x00ff00ff, 0x0000ffff], stops: [0, 0.5, 1], angle, radius });
  window.__testNodes = [
    mk(1000, 120, 360, 240, g(Math.PI / 4, 0)),
    mk(1400, 120, 360, 240, g((3 * Math.PI) / 4, 24)),
    mk(1000, 400, 360, 240, g(0.3, 0)),
    mk(1400, 400, 360, 240, g(Math.PI / 2, 0)),
  ];
  return true;
})()`);
await sleep(1500);
await c.shot(`${dir}/${tag}-${variant}.png`, 1);
await c.evaluate(`(() => { const r = window.__compatRenderer ?? window.rootElement._renderer; window.__testNodes.forEach((n) => n.destroy()); window.__testNodes = []; return true; })()`);
c.stopTicker(); c.close();

// node clipcheck.mjs: rounded-clip cases the quad-SDF approximation gets wrong on the current screen.
import { open } from './common.mjs';
const c = await open('own', { probe: false });
console.log(JSON.stringify(await c.evaluate(`(() => {
  const out = { ownRadiusInCorner: [], nestedRounded: [] };
  const bounds = (n) => [n._wx, n._wy, n._wx + n._w * n._wa, n._wy + n._h * n._wd];
  const inCorner = (b, c, r) => (b[0] < c[0] + r || b[2] > c[2] - r) && (b[1] < c[1] + r || b[3] > c[3] - r);
  const walk = (n, clips) => {
    if (n._worldAlpha <= 0.001) return;
    const inner = clips[clips.length - 1];
    const b = bounds(n);
    if (inner && n._w > 0 && n._h > 0 && b[2] > inner.b[0] && b[0] < inner.b[2] && b[3] > inner.b[1] && b[1] < inner.b[3]) {
      const hasR = n._shader && [1, 3, 4].includes(n._shader.kind);
      if (hasR && inCorner(b, inner.b, inner.r)) out.ownRadiusInCorner.push({ y: Math.round(b[1]), x: Math.round(b[0]), w: n._w, h: n._h, clipR: inner.r, t: n._shader.shaderType });
      if (clips.length > 1 && (n._texture || n.isTextNode || (n._color & 255)) && inCorner(b, clips[clips.length - 2].b, clips[clips.length - 2].r) && clips[clips.length - 2].r > 0) out.nestedRounded.push({ y: Math.round(b[1]), x: Math.round(b[0]), w: n._w, h: n._h });
    }
    let next = clips;
    if (n._clipping && n._clipRadius > 0) next = clips.concat([{ b, r: Math.min(n._clipRadius, n._w / 2, n._h / 2) }]);
    else if (n._clipping) next = clips.concat([{ b, r: 0 }]);
    n.children.forEach((ch) => walk(ch, next));
  };
  walk(window.__compatRenderer.root, []);
  out.ownRadiusInCorner = out.ownRadiusInCorner.filter((o) => o.clipR > 0).slice(0, 10);
  out.nestedRounded = out.nestedRounded.slice(0, 10);
  return out;
})()`)));
c.close();

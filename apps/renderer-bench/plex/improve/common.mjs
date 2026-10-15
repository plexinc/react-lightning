// Shared helpers for the improve/ scripts. Each variant is a dev server (../dev-compat.mts) plus
// its own headless Chrome: own = this worktree's compat layer, base = the compat layer at the
// starting commit (a second worktree, VITE_OWN_RENDERER_DIR), stock = @lightningjs/renderer.
// Each Chrome needs its own sign-in (plex-link-login) since localStorage is per origin.
import { readFileSync } from 'node:fs';
import { sleep } from '../cdp.mjs';

export const VARIANTS = {
  own: { port: 3481, chrome: 'http://127.0.0.1:9490' },
  stock: { port: 3482, chrome: 'http://127.0.0.1:9491' },
  base: { port: 3483, chrome: 'http://127.0.0.1:9492' },
};

export async function open(variant, { probe = true } = {}) {
  const v = VARIANTS[variant];
  process.env.CHROME_URL = v.chrome;
  globalThis.__noMetrics = true;
  const { attach: att } = await import('../cdp.mjs?' + variant + Math.random());
  const origin = `http://localhost:${v.port}`;
  const c = await att({ url: origin });
  c.origin = origin;
  if (probe) {
    const src = readFileSync(new URL('../probe.js', import.meta.url), 'utf8');
    c.probeId = (await c.send('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
  }
  c.texts = () => c.evaluate(`(() => { const out = []; const walk = (e) => { if (!e) return; if (e.isTextElement && e.node && e.node.text && e.visible) out.push(e.node.text); (e.children || []).forEach(walk); }; walk(window.rootElement); return out.join(' | '); })()`).catch(() => '');
  return c;
}

export async function reachHome(c, settle = 6000) {
  await c.send('Page.navigate', { url: c.origin + '/' });
  let t = '';
  for (let i = 0; i < 160; i++) { await sleep(500); t = await c.texts(); if (t.includes("Who's watching")) break; }
  await sleep(1500);
  await c.key('Enter');
  for (let i = 0; i < 160; i++) { await sleep(500); t = await c.texts(); if (t.includes('For You') && t.includes('Continue Watching')) break; }
  if (!t.includes('Continue Watching')) throw new Error('no home: ' + t.slice(0, 200));
  await sleep(settle);
  return t;
}

export async function waitIdle(c, quietMs = 1500, cap = 20000) {
  const t1 = Date.now();
  while (Date.now() - t1 < cap) {
    const idle = await c.evaluate(`(() => { const f = __probe.frames; for (let i = f.length - 1; i >= 0; i--) if (f[i][2] > 0) return performance.now() - f[i][0]; return 1e9; })()`);
    if (idle > quietMs) break;
    await sleep(250);
  }
}

export async function steps(c, keys, gap) {
  const start = Date.now();
  for (let i = 0; i < keys.length; i++) {
    const wait = start + i * gap - Date.now();
    if (wait > 0) await sleep(wait);
    await c.key(keys[i]);
  }
}

// Held key: repeated rawKeyDown with autoRepeat, then one keyUp.
export async function hold(c, k, count, gap) {
  const codes = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };
  const base = { key: k, code: k, windowsVirtualKeyCode: codes[k], nativeVirtualKeyCode: codes[k] };
  const start = Date.now();
  for (let i = 0; i < count; i++) {
    const wait = start + i * gap - Date.now();
    if (wait > 0) await sleep(wait);
    await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', autoRepeat: i > 0, ...base });
  }
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

export const rendererStats = `(() => {
  const r = window.__compatRenderer;
  if (r) { const s = r.stage; return { texMem: s.textures.memoryUsed + (s.textAtlas?.bytes ?? 0), atlasPages: s.textAtlas?.pageCount, atlasStandalone: s.textAtlas?.standalone, atlasEvictions: s.textAtlas?.evictions, uploads: s.textures.totalUploads, textRasters: s.stats.textRasterized, textLayouts: s.stats.textLayouts, quads: s.stats.quads, cache: s.textures._cache.size }; }
  const ls = window.rootElement?._renderer?.stage;
  const tm = ls?.txMemManager;
  return { texMem: tm?.memUsed ?? null };
})()`;

export { sleep };

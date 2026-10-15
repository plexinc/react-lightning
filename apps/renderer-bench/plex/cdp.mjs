// Minimal CDP client for the spike's own headless Chrome (port 9440).
import { writeFileSync } from 'node:fs';
export const CHROME = process.env.CHROME_URL ?? 'http://127.0.0.1:9440';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function attach({ newTab = false, url } = {}) {
  let page;
  if (!newTab) {
    const list = await (await fetch(`${CHROME}/json/list`)).json();
    page = list.find((p) => p.type === 'page' && (!url || p.url.startsWith(url)));
  }
  if (!page) page = await (await fetch(`${CHROME}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { r, j } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? j(new Error(JSON.stringify(msg.error))) : r(msg.result);
    } else if (msg.method) for (const fn of listeners.get(msg.method) ?? []) fn(msg.params);
  };
  const send = (method, params = {}) => new Promise((r, j) => { const i = ++id; pending.set(i, { r, j }); ws.send(JSON.stringify({ id: i, method, params })); });
  const on = (m, fn) => { if (!listeners.has(m)) listeners.set(m, []); listeners.get(m).push(fn); };
  const evaluate = async (expression, awaitPromise = true) => {
    const res = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? JSON.stringify(res.exceptionDetails));
    return res.result.value;
  };
  let ticker = null;
  const startTicker = (ms = 50) => {
    if (ticker) return;
    let busy = false;
    ticker = setInterval(async () => {
      if (busy) return; busy = true;
      try { await send('Page.captureScreenshot', { format: 'jpeg', quality: 1, optimizeForSpeed: true, clip: { x: 0, y: 0, width: 192, height: 108, scale: 0.1 } }); } catch {}
      busy = false;
    }, ms);
  };
  const stopTicker = () => { clearInterval(ticker); ticker = null; };
  const codes = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Enter: 13, Backspace: 8 };
  const key = async (k) => {
    const code = codes[k];
    const base = { key: k, code: k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  };
  // Reads the WebGL canvas inside a rAF right after the renderer drew (headless page captures of a
  // render-on-dirty canvas come back blank or garbled), composited on black like the page.
  const shot = async (file, scale = 0.5) => {
    const dataUrl = await evaluate(`new Promise((resolve) => {
      const grab = () => {
        const gl = document.querySelector('#app canvas');
        const out = document.createElement('canvas');
        out.width = Math.round(1920 * ${scale}); out.height = Math.round(1080 * ${scale});
        const ctx = out.getContext('2d');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(gl, 0, 0, out.width, out.height);
        resolve(out.toDataURL('image/png'));
      };
      requestAnimationFrame(() => requestAnimationFrame((t) => {
        const s = window.__compatRenderer?.stage;
        if (s) { s._lastFrame = 0; s._frame(t); grab(); return; }
        const ls = window.rootElement?._renderer?.stage;
        if (!ls) { grab(); return; }
        // Stock Lightning: grab right after its next drawFrame, while the buffer is still valid.
        const orig = ls.drawFrame;
        ls.drawFrame = function () { const r = orig.apply(this, arguments); ls.drawFrame = orig; grab(); return r; };
        ls.requestRender();
        ls.root.setUpdateType?.(1);
      }));
    })`);
    writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  };
  await send('Page.enable');
  await send('Page.bringToFront');
  await send('Runtime.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  if (!globalThis.__noMetrics) await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  return { page, send, on, evaluate, key, shot, startTicker, stopTicker, close: () => ws.close() };
}

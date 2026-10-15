export const CHROME = process.env.CHROME_URL ?? 'http://127.0.0.1:9477';
export const APP = process.env.APP_URL ?? 'http://127.0.0.1:4893';

export async function connect() {
  const page = await (await fetch(`${CHROME}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });

  let id = 0;
  const pending = new Map();
  const listeners = new Map();

  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);

    if (msg.id && pending.has(msg.id)) {
      const { r, j } = pending.get(msg.id);

      pending.delete(msg.id);
      if (msg.error) j(new Error(JSON.stringify(msg.error)));
      else r(msg.result);
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) ?? []) fn(msg.params);
    }
  };

  const send = (method, params = {}) =>
    new Promise((r, j) => {
      const i = ++id;

      pending.set(i, { r, j });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(fn);
  };
  const evaluate = async (expression, awaitPromise = true) => {
    const res = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });

    if (res.exceptionDetails)
      throw new Error(
        res.exceptionDetails.exception?.description ?? JSON.stringify(res.exceptionDetails),
      );

    return res.result.value;
  };
  // Headless only produces frames when something asks for them; a cheap screenshot ticker keeps rAF advancing.
  let ticker = null;
  const startTicker = () => {
    if (ticker) return;
    let busy = false;
    ticker = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        await send('Page.captureScreenshot', {
          format: 'jpeg',
          quality: 1,
          optimizeForSpeed: true,
        });
      } catch {}
      busy = false;
    }, 50);
  };
  const stopTicker = () => {
    clearInterval(ticker);
    ticker = null;
  };
  const keyCodes = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
  const key = async (k) => {
    const code = keyCodes[k];
    const base = { key: k, code: k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };

    await Promise.all([
      send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base }),
      send('Input.dispatchKeyEvent', { type: 'keyUp', ...base }),
    ]);
  };

  await send('Page.enable');
  await send('Network.enable');
  await send('Network.clearBrowserCache');
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Runtime.enable');
  await send('Performance.enable', { timeDomain: 'timeTicks' });
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });

  return {
    send,
    on,
    evaluate,
    key,
    startTicker,
    stopTicker,
    close: async () => {
      stopTicker();
      ws.close();
      await fetch(`${CHROME}/json/close/${page.id}`).catch(() => {});
    },
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

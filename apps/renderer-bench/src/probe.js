// Injected via CDP before any page script. Same instrumentation for both renderers.
(() => {
  const P = (window.__probe = {
    frames: [],
    gl: { draw: 0, tex: 0, sub: 0, buf: 0 },
    lt: [],
    frameOn: true,
  });
  const wrap = (proto, name, key) => {
    const orig = proto[name];
    if (!orig) return;
    proto[name] = function () {
      P.gl[key]++;
      return orig.apply(this, arguments);
    };
  };
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue;
    wrap(C.prototype, 'drawElements', 'draw');
    wrap(C.prototype, 'drawArrays', 'draw');
    wrap(C.prototype, 'texImage2D', 'tex');
    wrap(C.prototype, 'texSubImage2D', 'sub');
    wrap(C.prototype, 'bufferSubData', 'buf');
    wrap(C.prototype, 'bufferData', 'buf');
  }
  const origRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    origRaf((t) => {
      const g = P.gl;
      const d0 = g.draw,
        t0 = g.tex + g.sub;
      const s = performance.now();
      try {
        cb(t);
      } finally {
        const e = performance.now();
        if (P.frameOn) P.frames.push([s, e - s, g.draw - d0, g.tex + g.sub - t0]);
      }
    });
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) P.lt.push([e.startTime, e.duration]);
    }).observe({ entryTypes: ['longtask'] });
  } catch {}
})();

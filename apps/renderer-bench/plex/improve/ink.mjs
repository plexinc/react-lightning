// node ink.mjs x,y,w,h a.png b.png ...: centroid and extents of bright (text) pixels per image.
import { readFileSync } from 'node:fs';
globalThis.__noMetrics = true;
process.env.CHROME_URL ??= 'http://127.0.0.1:9492';
const { attach } = await import('../cdp.mjs');
const [crop, ...files] = process.argv.slice(2);
const c = await attach({ newTab: true });
for (const f of files) {
  const r = await c.evaluate(`(async () => {
    const i = new Image(); await new Promise((r) => { i.onload = r; i.src = ${JSON.stringify('data:image/png;base64,' + readFileSync(f).toString('base64'))}; });
    const [x, y, w, h] = ${JSON.stringify(crop.split(',').map(Number))};
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.drawImage(i, -x, -y);
    const d = g.getImageData(0, 0, w, h).data; let sx = 0, sy = 0, s = 0, minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const k = (yy * w + xx) * 4; const v = (d[k] + d[k + 1] + d[k + 2]) / 3; if (v > 140) { const wt = v / 255; sx += xx * wt; sy += yy * wt; s += wt; if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (yy < minY) minY = yy; if (yy > maxY) maxY = yy; } }
    return { cx: +(x + sx / s).toFixed(2), cy: +(y + sy / s).toFixed(2), ink: +s.toFixed(0), x0: x + minX, x1: x + maxX, y0: y + minY, y1: y + maxY };
  })()`);
  console.log(f.split('/').pop(), JSON.stringify(r));
}
await c.send('Page.close').catch(() => {});
c.close();

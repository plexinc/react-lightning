// node crop.mjs out.png x,y,w,h zoom a.png b.png [c.png ...]: crops stacked vertically, zoomed (nearest).
import { readFileSync, writeFileSync } from 'node:fs';
globalThis.__noMetrics = true;
process.env.CHROME_URL ??= 'http://127.0.0.1:9492';
const { attach } = await import('../cdp.mjs');
const [out, crop, zoom, ...files] = process.argv.slice(2);
const c = await attach({ newTab: true });
const urls = files.map((f) => 'data:image/png;base64,' + readFileSync(f).toString('base64'));
const png = await c.evaluate(`(async () => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  const imgs = await Promise.all(${JSON.stringify(urls)}.map(load));
  const [x, y, w, h] = ${JSON.stringify(crop.split(',').map(Number))}; const z = ${Number(zoom)};
  const cv = document.createElement('canvas'); cv.width = w * z; cv.height = (h * z + 4) * imgs.length;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#f0f'; g.fillRect(0, 0, cv.width, cv.height);
  imgs.forEach((im, i) => g.drawImage(im, x, y, w, h, 0, i * (h * z + 4), w * z, h * z));
  return cv.toDataURL('image/png');
})()`);
writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
await c.send('Page.close').catch(() => {});
c.close();

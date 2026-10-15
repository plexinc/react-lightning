// node diff.mjs a.png b.png out.png [x,y,w,h]: amplified abs diff in a scratch tab, prints mean diff and changed-pixel share.
import { readFileSync, writeFileSync } from 'node:fs';
globalThis.__noMetrics = true;
process.env.CHROME_URL ??= 'http://127.0.0.1:9492';
const { attach } = await import('../cdp.mjs');
const [a, b, out, crop] = process.argv.slice(2);
const c = await attach({ newTab: true });
const du = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');
const res = await c.evaluate(`(async () => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  const [A, B] = await Promise.all([load(${JSON.stringify(du(a))}), load(${JSON.stringify(du(b))})]);
  const [x, y, w, h] = ${JSON.stringify(crop ? crop.split(',').map(Number) : null)} ?? [0, 0, A.width, A.height];
  const cv = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, -x, -y); return [c, g, g.getImageData(0, 0, w, h)]; };
  const [ca, ga, da] = cv(A); const [, , db] = cv(B);
  const o = ga.createImageData(w, h); let sum = 0, changed = 0;
  for (let i = 0; i < da.data.length; i += 4) {
    const d = (Math.abs(da.data[i] - db.data[i]) + Math.abs(da.data[i + 1] - db.data[i + 1]) + Math.abs(da.data[i + 2] - db.data[i + 2])) / 3;
    sum += d; if (d > 24) changed++;
    const v = Math.min(255, d * 4); o.data[i] = v; o.data[i + 1] = v; o.data[i + 2] = v; o.data[i + 3] = 255;
  }
  ga.putImageData(o, 0, 0);
  return { mean: sum / (w * h), changedPct: (100 * changed) / (w * h), png: ca.toDataURL('image/png') };
})()`);
writeFileSync(out, Buffer.from(res.png.split(',')[1], 'base64'));
console.log(`mean ${res.mean.toFixed(2)} changed ${res.changedPct.toFixed(2)}%`);
await c.send('Page.close').catch(() => {});
c.close();

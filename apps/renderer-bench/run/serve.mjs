import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = normalize(join(import.meta.dirname, '..', process.env.DIST ?? 'dist'));
const port = Number(process.argv[2] ?? 4893);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
};

createServer((req, res) => {
  const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));

  if (!path.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }

  try {
    if (!statSync(path).isFile()) throw new Error();
    res.writeHead(200, {
      'content-type': types[extname(path)] ?? 'application/octet-stream',
      'cache-control': extname(path) === '.html' ? 'no-store' : 'max-age=3600',
      'access-control-allow-origin': '*',
    });
    createReadStream(path).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
}).listen(port, '127.0.0.1');

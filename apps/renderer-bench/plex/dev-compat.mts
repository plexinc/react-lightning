// Local-only launcher: the Plex Lightning dev server with a runtime switch between the stock
// @lightningjs/renderer and the own-renderer compat layer. Run from apps/plex/targets/lightning:
//   LNG_DEV_PORT=3421 node_modules/.bin/tsx <this file>
// ?renderer=own|stock or F9 picks the renderer (stored in localStorage, default stock).
//
// `@lightningjs/renderer*` resolves to /__renderer/<entry>.js, redirected by cookie to one implementation.
// A top-level-await switch reordered module evaluation and hung the app on its splash, hence the redirect.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const lightningDir = process.cwd();
const switchDir = join(dirname(fileURLToPath(import.meta.url)), 'switch');
const genDir = join(switchDir, '.gen');
const compatDir =
  process.env.VITE_OWN_RENDERER_DIR ??
  '/Volumes/Development/react-lightning-worktrees/own-renderer-compat/packages/renderer/src/compat';

const vite = await import(
  pathToFileURL(join(lightningDir, 'node_modules/vite/dist/node/index.js')).href
);
const { createViteConfig } = await import(
  pathToFileURL(join(lightningDir, 'scripts/vite/createViteConfig.ts')).href
);
const { config } = await createViteConfig(process.argv.slice(2));

// [specifier subpath, compat file]
const entries: [string, string][] = [
  ['', 'index'],
  ['utils', 'utils'],
  ['canvas', 'canvas'],
  ['canvas/shaders', 'shaderExports'],
  ['webgl', 'webgl'],
  ['webgl/shaders', 'shaderExports'],
  ['inspector', 'inspector'],
  ['platforms', 'platforms'],
];

const specifier = (sub: string) => (sub ? `@lightningjs/renderer/${sub}` : '@lightningjs/renderer');
const entryName = (sub: string) => sub.replaceAll('/', '-') || 'index';
const PREFIX = '/__renderer/';

for (const mode of ['own', 'stock'] as const) {
  mkdirSync(join(genDir, mode), { recursive: true });

  for (const [sub, compatFile] of entries) {
    const source = JSON.stringify(
      mode === 'own' ? join(compatDir, `${compatFile}.ts`) : specifier(sub),
    );
    const lines = [`import '../../mode.ts';`, `export * from ${source};`];

    if (sub === '') {
      // Subclassed only to hook fpsUpdate for the badge.
      lines.push(
        `import { onRenderer } from '../../mode.ts';`,
        `import { RendererMain as Base } from ${source};`,
        `export class RendererMain extends Base {`,
        `  constructor(settings, target) {`,
        `    super({ fpsUpdateInterval: 1000, ...settings }, target);`,
        `    onRenderer(this);`,
        `  }`,
        `}`,
      );
    }

    writeFileSync(join(genDir, mode, `${entryName(sub)}.js`), `${lines.join('\n')}\n`);
  }
}

// Runs before any module script: applies ?renderer= (then reloads without it) and mirrors the
// stored choice into the cookie the /__renderer/ redirect reads.
const headScript = `(() => {
  const key = 'lng.renderer';
  const params = new URLSearchParams(location.search);
  const requested = params.get('renderer');
  let mode = null;
  try { mode = localStorage.getItem(key); } catch {}
  if (requested === 'own' || requested === 'stock') {
    try { localStorage.setItem(key, requested); } catch {}
    params.delete('renderer');
    const query = params.toString();
    location.replace(location.pathname + (query ? '?' + query : '') + location.hash);
    mode = requested;
  }
  document.cookie = key + '=' + (mode === 'own' ? 'own' : 'stock') + '; path=/; SameSite=Lax';
})();`;

const match = (id: string) => entries.find(([sub]) => id === specifier(sub));
const fromSwitch = (importer?: string) => !!importer && importer.startsWith(genDir);
const switchUrl = (sub: string) => `${PREFIX}${entryName(sub)}.js`;

const final = vite.mergeConfig(config, {
  plugins: [
    {
      name: 'renderer-switch',
      enforce: 'pre',
      resolveId(id: string, importer?: string) {
        if (id.startsWith(PREFIX)) {
          return id;
        }

        const hit = match(id);

        return hit && !fromSwitch(importer) ? switchUrl(hit[0]) : null;
      },
      load(id: string) {
        // Only reached by Vite's own pre-transform; browsers get the redirect below.
        return id.startsWith(PREFIX) ? 'export {};' : null;
      },
      transformIndexHtml: () => [
        { tag: 'script', children: headScript, injectTo: 'head-prepend' },
      ],
      configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
        server.middlewares.use(
          (
            req: { url?: string; headers: { cookie?: string } },
            res: { statusCode: number; setHeader: (k: string, v: string) => void; end: () => void },
            next: () => void,
          ) => {
            const path = req.url?.split('?')[0];

            if (!path?.startsWith(PREFIX)) {
              return next();
            }

            const own = /(?:^|;\s*)lng\.renderer=own(?:;|$)/.test(req.headers.cookie ?? '');
            const file = join(genDir, own ? 'own' : 'stock', path.slice(PREFIX.length));
            res.statusCode = 302;
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Location', `/@fs${file}`);
            res.end();
          },
        );
      },
    },
  ],
  server: { fs: { allow: [compatDir, switchDir] } },
  optimizeDeps: {
    // Stock stays prebundled as in a normal run; the stock switch modules import it by name.
    include: entries.map(([sub]) => specifier(sub)),
    rolldownOptions: {
      plugins: [
        {
          // Keep both renderers out of the react-lightning prebundle.
          name: 'renderer-switch-external',
          resolveId(id: string, importer?: string) {
            const hit = importer && !fromSwitch(importer) ? match(id) : undefined;

            return hit ? { id: switchUrl(hit[0]), external: true } : null;
          },
        },
      ],
    },
  },
  cacheDir: join(lightningDir, 'node_modules/.vite-renderer-switch'),
});

console.log('[dev-compat] renderer switch: stock or', compatDir);

const server = await vite.createServer({ ...final, configFile: false });

// Files outside the Vite root aren't watched by default.
server.watcher.add([join(compatDir, '..'), switchDir]);

await server.listen();
server.printUrls();

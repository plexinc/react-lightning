// Local-only launcher: the Plex Lightning dev server with a runtime renderer switch. Run from
// apps/plex/targets/lightning:
//   LNG_DEV_PORT=3421 node_modules/.bin/tsx <this file>
// ?renderer=stock|compat|direct (own = compat) or F9 (stock -> compat -> direct) picks it, stored in localStorage.
//
// stock:  @lightningjs/renderer 3.1.1.
// compat: the own renderer behind the @lightningjs/renderer compat layer (packages/renderer/src/compat).
// direct: @plextv/react-native-webtv's `renderer: 'webtv'`, react-lightning elements drawn as scene nodes.
//
// LNG_BUILD=stock|own|direct LNG_BUILD_OUT=<dir> builds that one renderer for production instead (the
// cookie switch only exists in the dev server), and LNG_PREVIEW_PORT=<port> then serves it.
//
// Every @plextv package the app imports is served from this worktree's source in all three modes, so they
// compare the same react-lightning code. `@lightningjs/renderer*` resolves to /__renderer/<entry>.js,
// redirected by cookie to stock or compat (a top-level-await switch hung the app on its splash).
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Vite serve sets this anyway; set it first so the app's React Compiler config only warns about
// compile errors in the worktree's source packages instead of throwing.
process.env.NODE_ENV ??= 'development';

const lightningDir = process.cwd();
const benchDir = dirname(fileURLToPath(import.meta.url));
const switchDir = join(benchDir, 'switch');
const genDir = join(switchDir, '.gen');
const repoDir = join(benchDir, '../../..');
const packagesDir = join(repoDir, 'packages');
const compatDir = process.env.VITE_OWN_RENDERER_DIR ?? join(packagesDir, 'renderer/src/compat');
const shim = join(switchDir, 'react-lightning.ts');

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
// stored choice into the cookie the /__renderer/ redirect reads (direct draws with the compat stage).
const headScript = `(() => {
  const key = 'lng.renderer';
  const params = new URLSearchParams(location.search);
  let requested = params.get('renderer');
  if (requested === 'compat') requested = 'own';
  let mode = null;
  try { mode = localStorage.getItem(key); } catch {}
  if (requested === 'own' || requested === 'stock' || requested === 'direct') {
    try { localStorage.setItem(key, requested); } catch {}
    params.delete('renderer');
    const query = params.toString();
    location.replace(location.pathname + (query ? '?' + query : '') + location.hash);
    mode = requested;
  }
  document.cookie = key + '=' + (mode === 'own' || mode === 'direct' ? 'own' : 'stock') + '; path=/; SameSite=Lax';
})();`;

// @plextv packages -> this worktree's source, through each package's own `exports`.
const sourcePackages: Record<string, string> = {
  '@plextv/react-lightning': 'react-lightning',
  '@plextv/react-lightning-components': 'react-lightning-components',
  '@plextv/react-lightning-plugin-css-transform': 'plugin-css-transform',
  '@plextv/react-lightning-plugin-flexbox': 'plugin-flexbox',
  '@plextv/react-lightning-plugin-reanimated': 'plugin-reanimated',
  '@plextv/react-native-lightning': 'react-native-lightning',
  '@plextv/react-native-webtv': 'react-native-webtv',
};

const sourceExports = new Map<string, Record<string, string>>();

for (const [name, dir] of Object.entries(sourcePackages)) {
  const pkg = JSON.parse(readFileSync(join(packagesDir, dir, 'package.json'), 'utf8'));

  sourceExports.set(name, pkg.exports);
}

const sourceFile = (name: string, sub: string): string | null => {
  const exports = sourceExports.get(name);
  const target = exports?.[sub ? `./${sub}` : '.'];

  return typeof target === 'string' ? join(packagesDir, sourcePackages[name], target) : null;
};

// The app's installed copies, as the Plex vite config aliases them (absolute dirs, both spellings).
const appRequire = createRequire(join(lightningDir, 'package.json'));
const configRequire = createRequire(join(lightningDir, '../../../../packages/config/package.json'));
const installedDirs: [string, string][] = [];

for (const name of Object.keys(sourcePackages)) {
  for (const req of [appRequire, configRequire]) {
    try {
      const dir = dirname(req.resolve(`${name}/package.json`));

      installedDirs.push([dir, name], [realpathSync(dir), name]);
    } catch {}
  }
}

const fromInstalled = (id: string): string | null => {
  for (const [dir, name] of installedDirs) {
    if (id === dir || id.startsWith(`${dir}/`)) {
      const rest = id.slice(dir.length + 1);

      // Package root, or its built main file: the source entry.
      if (rest === '' || rest.startsWith('dist/index')) {
        return sourceFile(name, '');
      }

      return sourceFile(name, rest) ?? sourceFile(name, '');
    }
  }

  return null;
};

const toSource = (id: string, importer?: string): string | null => {
  if (
    id === '@plextv/react-lightning' &&
    importer !== shim &&
    !importer?.includes('/react-native-webtv/')
  ) {
    return shim;
  }

  const bare = /^(@plextv\/[^/]+)(?:\/(.+))?$/.exec(id);

  if (bare && sourceExports.has(bare[1])) {
    return sourceFile(bare[1], bare[2] ?? '');
  }

  if (id.startsWith('/') && !id.startsWith(PREFIX)) {
    return fromInstalled(id);
  }

  if (id === 'react-native-reanimated') {
    return sourceFile('@plextv/react-lightning-plugin-reanimated', '');
  }

  return null;
};

const buildMode = process.env.LNG_BUILD as 'stock' | 'own' | 'direct' | undefined;

const match = (id: string) => entries.find(([sub]) => id === specifier(sub));
const fromSwitch = (importer?: string) => !!importer && importer.startsWith(genDir);
const switchUrl = (sub: string) => `${PREFIX}${entryName(sub)}.js`;

const rendererSwitch = {
  name: 'renderer-switch',
  enforce: 'pre' as const,
  resolveId(id: string, importer?: string) {
    if (id.startsWith(PREFIX)) {
      return id;
    }

    const hit = match(id);

    if (hit) {
      if (buildMode) {
        return buildMode === 'stock' || fromSwitch(importer)
          ? null
          : join(compatDir, `${hit[1]}.ts`);
      }

      return fromSwitch(importer) ? null : switchUrl(hit[0]);
    }

    const source = toSource(id, importer);

    return source && importer !== source ? source : null;
  },
  load(id: string) {
    // Only reached by Vite's own pre-transform; browsers get the redirect below.
    return id.startsWith(PREFIX) ? 'export {};' : null;
  },
  transformIndexHtml: () => [
    {
      tag: 'script',
      children: buildMode
        ? `try { localStorage.setItem('lng.renderer', ${JSON.stringify(buildMode)}); } catch {}`
        : headScript,
      injectTo: 'head-prepend',
    },
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
};

const final = vite.mergeConfig(config, {
  resolve: {
    dedupe: ['react-native-reanimated', 'react-native-worklets'],
  },
  server: { fs: { allow: [repoDir] } },
  optimizeDeps: {
    // Stock stays prebundled as in a normal run; the stock switch modules import it by name.
    include: entries.map(([sub]) => specifier(sub)),
    rolldownOptions: {
      plugins: [
        {
          // Keep both renderers and the source packages out of other prebundles.
          name: 'renderer-switch-external',
          resolveId(id: string, importer?: string) {
            const hit = importer && !fromSwitch(importer) ? match(id) : undefined;

            if (hit) {
              return { id: switchUrl(hit[0]), external: true };
            }

            return id.startsWith('@plextv/') &&
              sourceExports.has(id.split('/').slice(0, 2).join('/'))
              ? { id, external: true }
              : null;
          },
        },
      ],
    },
  },
  cacheDir: join(lightningDir, 'node_modules/.vite-renderer-switch-direct'),
});

// First, so the reanimated and react-native aliases of the app's plugins resolve to source too.
final.plugins = [rendererSwitch, ...(final.plugins ?? [])];

if (buildMode) {
  const outDir = process.env.LNG_BUILD_OUT ?? join(genDir, `dist-${buildMode}`);

  if (!process.env.LNG_PREVIEW_PORT) {
    process.env.NODE_ENV = 'production';
    await vite.build({
      ...final,
      configFile: false,
      mode: 'production',
      define: { ...final.define, __DEV__: 'false' },
      build: { ...final.build, outDir, emptyOutDir: true, watch: null, sourcemap: false },
    });
    console.log('[dev-compat] built', buildMode, 'into', outDir);
  } else {
    const preview = await vite.preview({
      ...final,
      configFile: false,
      build: { ...final.build, outDir },
      preview: { ...final.preview, port: Number(process.env.LNG_PREVIEW_PORT), strictPort: true },
    });

    preview.printUrls();
  }

  process.exitCode = 0;
} else {
  await serve();
}

async function serve() {
  console.log('[dev-compat] renderer switch: stock, compat or direct; packages from', packagesDir);

  const server = await vite.createServer({ ...final, configFile: false });

  // Files outside the Vite root aren't watched by default.
  server.watcher.add([packagesDir, switchDir]);

  await server.listen();
  server.printUrls();
}

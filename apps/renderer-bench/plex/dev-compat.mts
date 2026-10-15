// Local-only launcher: the Plex Lightning dev server with @lightningjs/renderer
// aliased to the own-renderer compat layer. Run from apps/plex/targets/lightning:
//   VITE_OWN_RENDERER=1 LNG_DEV_PORT=3421 node_modules/.bin/tsx <this file>
// VITE_OWN_RENDERER=0 serves the stock renderer through the same launcher.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const lightningDir = process.cwd();
const compatDir =
  process.env.VITE_OWN_RENDERER_DIR ??
  '/Volumes/Development/react-lightning-worktrees/own-renderer-compat/packages/renderer/src/compat';
const own = process.env.VITE_OWN_RENDERER === '1';

const vite = await import(
  pathToFileURL(join(lightningDir, 'node_modules/vite/dist/node/index.js')).href
);
const { createViteConfig } = await import(
  pathToFileURL(join(lightningDir, 'scripts/vite/createViteConfig.ts')).href
);
const { config } = await createViteConfig(process.argv.slice(2));

const subpaths: [string, string][] = [
  ['webgl/shaders', 'shaderExports.ts'],
  ['canvas/shaders', 'shaderExports.ts'],
  ['webgl', 'webgl.ts'],
  ['canvas', 'canvas.ts'],
  ['inspector', 'inspector.ts'],
  ['utils', 'utils.ts'],
  ['platforms', 'platforms.ts'],
];
const alias = [
  ...subpaths.map(([sub, file]) => ({
    find: new RegExp(`^@lightningjs/renderer/${sub}$`),
    replacement: `${compatDir}/${file}`,
  })),
  { find: /^@lightningjs\/renderer$/, replacement: `${compatDir}/index.ts` },
];

const final = own
  ? vite.mergeConfig(config, {
      resolve: { alias },
      server: { fs: { allow: [compatDir] } },
      optimizeDeps: {
        rolldownOptions: {
          plugins: [
            {
              // Keep the compat layer out of the react-lightning prebundle, so edits apply and there's one copy.
              name: 'own-renderer-external',
              resolveId(id: string) {
                const hit = alias.find((a) => a.find.test(id));

                return hit ? { id: hit.replacement, external: true } : null;
              },
            },
          ],
        },
      },
      // Separate prebundle cache so stock and compat runs never share one.
      cacheDir: join(lightningDir, 'node_modules/.vite-own-renderer'),
    })
  : config;

if (own) {
  final.resolve.dedupe = (final.resolve.dedupe ?? []).filter(
    (d: string) => d !== '@lightningjs/renderer',
  );
  console.log('[dev-compat] @lightningjs/renderer ->', compatDir);
}

const server = await vite.createServer({ ...final, configFile: false });

if (own) {
  // Files outside the Vite root aren't watched by default.
  server.watcher.add(join(compatDir, '..'));
}

await server.listen();
server.printUrls();

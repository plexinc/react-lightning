import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';

const extensions = [
  '.lng.tsx',
  '.web.tsx',
  '.tsx',
  '.lng.ts',
  '.web.ts',
  '.ts',
  '.lng.jsx',
  '.web.jsx',
  '.jsx',
  '.lng.js',
  '.web.js',
  '.js',
  '.json',
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPath = resolve(__dirname, '..');
const require = createRequire(rootPath);
const reactNativeLightningPath = require.resolve(
  '@plex/react-native-lightning',
);

type Options = {
  reactOptions?: Parameters<typeof react>[0];
};

const vitePlugin = (options?: Options): PluginOption => [
  react(options?.reactOptions),
  {
    name: 'vite-react-native-lightning',
    enforce: 'pre',
    config: () => ({
      define: {
        global: 'window',
      },
      optimizeDeps: {
        esbuildOptions: {
          resolveExtensions: extensions,
        },
      },
      resolve: {
        extensions,
        alias: {
          'react-native': reactNativeLightningPath,
        },
      },
    }),
  },
];

export default vitePlugin;

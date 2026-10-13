import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';

import { getStubAliases, type StubOptions } from './stubAliases';

export type { StubOptions } from './stubAliases';

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

type Options = {
  cwd?: string;
  reactOptions?: Parameters<typeof react>[0];
  babelOptions?: Parameters<typeof babel>[0];
  stubs?: StubOptions | false;
};

const stubDir = join(dirname(fileURLToPath(import.meta.url)), 'stubs');

const vitePlugin = (options?: Options): PluginOption => {
  return [
    react(options?.reactOptions),
    babel({ presets: [reactCompilerPreset()], ...options?.babelOptions }),
    {
      name: 'vite-react-native-lightning',
      enforce: 'pre',
      config: () => ({
        optimizeDeps: {
          esbuildOptions: {
            resolveExtensions: extensions,
          },
        },
        resolve: {
          extensions,
          alias: [
            { find: 'react-native', replacement: '@plextv/react-native-lightning' },
            ...getStubAliases(options?.stubs, stubDir, '.mjs'),
          ],
        },
      }),
    },
  ];
};

export default vitePlugin;

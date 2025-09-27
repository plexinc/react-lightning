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

type Options = {
  cwd?: string;
  reactOptions?: Parameters<typeof react>[0];
};

const vitePlugin = (options?: Options): PluginOption => {
  return [
    react(options?.reactOptions),
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
          alias: {
            'react-native': '@plextv/react-native-lightning',
          },
        },
      }),
    },
  ];
};

export default vitePlugin;

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPath = resolve(__dirname, '..');
const require = createRequire(rootPath);
const reactNativeLightningReanimatedPath = require.resolve(
  '@plex/react-lightning-plugin-reanimated',
);
const reactReanimatedPath = require.resolve('react-native-reanimated');

const plugin = (): Plugin => ({
  name: 'vite-react-reanimated-lightning',
  enforce: 'pre',
  config: () => ({
    resolve: {
      alias: {
        'react-native-reanimated': reactNativeLightningReanimatedPath,
        'react-native-reanimated-original': reactReanimatedPath,
      },
    },
  }),
});

export default plugin;

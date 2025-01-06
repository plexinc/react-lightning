import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginPath = resolve(__dirname, '..');
const require = createRequire(pluginPath);
const reanimatedPath = require.resolve('react-native-reanimated');

/**
 * @type {import('vite').InlineConfig}
 */
const config = {
  resolve: {
    alias: {
      'react-native-reanimated': pluginPath,
      'react-native-reanimated-original': reanimatedPath,
    },
  },
};

export default config;

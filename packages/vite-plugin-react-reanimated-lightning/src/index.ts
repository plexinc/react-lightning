import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

type Options = {
  cwd?: string;
};

const plugin = (options?: Options): Plugin => {
  const require = createRequire(options?.cwd ?? process.cwd());
  const reactNativeLightningReanimatedPath = require.resolve(
    '@plextv/react-lightning-plugin-reanimated',
  );
  const reactReanimatedPath = require.resolve('react-native-reanimated');

  return {
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
  };
};

export default plugin;

import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

type Options = {
  cwd?: string;
};

const plugin = (options?: Options): Plugin => {
  const require = createRequire(options?.cwd ?? process.cwd());

  const alias: Record<string, string> = {};

  // This needs to be first
  try {
    alias['react-native-reanimated/scripts/validate-worklets-version'] =
      require.resolve(
        'react-native-reanimated/scripts/validate-worklets-version',
      );
  } catch {
    // Do nothing
  }

  alias['react-native-reanimated'] = require.resolve(
    '@plextv/react-lightning-plugin-reanimated',
  );
  alias['react-native-reanimated-original'] = require.resolve(
    'react-native-reanimated',
  );

  return {
    name: 'vite-react-reanimated-lightning',
    enforce: 'pre',
    config: () => ({
      resolve: {
        alias,
      },
    }),
  };
};

export default plugin;

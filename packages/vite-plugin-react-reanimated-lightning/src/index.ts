import { createRequire } from 'module';

import type { Plugin } from 'vite';

type Options = {
  cwd?: string;
};

const WORKLET_VERSION_SHIM_ID = '\0worklet-version-check-shim';

const plugin = (options?: Options): Plugin => {
  const require = createRequire(options?.cwd ?? process.cwd());
  const resolveOptions = options?.cwd ? { paths: [options.cwd] } : undefined;
  const reanimatedShimPath = require.resolve(
    '@plextv/react-lightning-plugin-reanimated',
    resolveOptions,
  );
  const reanimatedOriginalPath = require.resolve('react-native-reanimated', resolveOptions);

  return {
    name: 'vite-react-reanimated-lightning',
    enforce: 'pre',
    config: () => ({
      optimizeDeps: {
        // plugin-flexbox uses a ?worker&inline Vite import that rolldown's
        // dep optimizer can't resolve. Exclude it so Vite handles it via its
        // normal transform pipeline instead.
        exclude: ['@plextv/react-lightning-plugin-flexbox'],
      },
    }),
    resolveId(source) {
      switch (source) {
        case 'react-native-reanimated/scripts/validate-worklets-version':
          return WORKLET_VERSION_SHIM_ID;
        case 'react-native-reanimated':
          return reanimatedShimPath;
        case 'react-native-reanimated-original':
          return reanimatedOriginalPath;
      }

      return null;
    },
    load(id) {
      if (id === WORKLET_VERSION_SHIM_ID) {
        return 'export default function validateWorkletsVersion() {\n  return { ok: true };\n}\n';
      }

      return null;
    },
  };
};

export default plugin;

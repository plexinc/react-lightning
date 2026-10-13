import { defineConfig, type UserConfig } from 'tsdown';

import baseConfig from '@repo/configs/tsdown.node.config';

const config: UserConfig = defineConfig({
  ...baseConfig,
  entry: ['src/index.ts', 'src/stubs/*.ts'],
  deps: {
    neverBundle: [/^node:.*/, 'react-native'],
  },
});

export default config;

import { defineConfig, type UserConfig } from 'tsdown';

import baseConfig from '@repo/configs/tsdown.config';

const config: UserConfig = defineConfig({
  ...baseConfig,
  entry: ['src/index.ts', 'src/lightning.ts', 'src/webtv.ts'],
});

export default config;

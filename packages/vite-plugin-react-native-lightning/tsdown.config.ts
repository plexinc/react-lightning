import { defineConfig, type UserConfig } from 'tsdown';
import baseConfig from '../configs/tsdown.config';

const config: UserConfig = defineConfig({
  ...baseConfig,
  format: 'esm',
  target: 'node22',
  exports: {
    devExports: false,
  },
});

export default config;

import baseConfig from '@repo/configs/tsdown.config';
import { defineConfig } from 'tsdown';

export default defineConfig({
  ...baseConfig,
  format: 'esm',
  target: 'node22',
  exports: {
    devExports: false,
  },
});

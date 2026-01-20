import { defineConfig, type UserConfig } from 'tsdown';
// @ts-expect-error: Needed for unrun to resolve this module correctly
import baseConfig from './tsdown.config.ts';

const config: UserConfig = defineConfig({
  ...baseConfig,
  format: 'esm',
  target: 'node22',
  platform: 'node',
  external: [/^node:.*/],
  exports: {
    devExports: false,
  },
});

export default config;

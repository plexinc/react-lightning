import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'chrome56',
  platform: 'browser',
  sourcemap: true,
  dts: {
    oxc: true,
  },
  loader: {
    '.png': 'asset',
  },
  exports: {
    devExports: true,
  },
  inputOptions: {
    experimental: {
      resolveNewUrlToAsset: true,
    },
  },
});

export default config;

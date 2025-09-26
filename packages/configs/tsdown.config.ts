import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  target: 'chrome56',
  platform: 'browser',
  sourcemap: true,
  dts: true,
  loader: {
    '.png': 'asset',
  },
  // minify: false,
  exports: {
    devExports: true,
  },
  inputOptions: {
    experimental: {
      resolveNewUrlToAsset: true,
    },
  },
});

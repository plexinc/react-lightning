import pluginBabel from '@rollup/plugin-babel';
import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
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
  plugins: [
    pluginBabel({
      babelHelpers: 'bundled',
      parserOpts: {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      },
      plugins: ['babel-plugin-react-compiler'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
  ],
});

export default config;

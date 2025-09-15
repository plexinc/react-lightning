import config from '@repo/vite-config/lib';
import babel from '@rollup/plugin-babel';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';

export default defineConfig((env) =>
  mergeConfig<UserConfig, UserConfig>(config(env), {
    base: './',
    build: {
      rollupOptions: {
        external: ['yoga-layout/load', 'tseep'],
      },
    },
    plugins: [
      // Use babel to transpile workers too
      babel({
        babelHelpers: 'runtime',
        presets: [
          [
            '@babel/env',
            {
              useBuiltIns: 'usage',
              corejs: 3,
            },
          ],
        ],
        plugins: ['@babel/plugin-transform-runtime'],
      }),
    ],
  }),
);

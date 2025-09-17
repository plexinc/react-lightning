import config from '@repo/vite-config/lib';
import babel from '@rollup/plugin-babel';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import { externalizeDeps } from 'vite-plugin-externalize-deps';

export default defineConfig((env) =>
  mergeConfig<UserConfig, UserConfig>(config(env), {
    base: './',
    plugins: [
      externalizeDeps(),
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

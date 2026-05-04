import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import { externalizeDeps } from 'vite-plugin-externalize-deps';

import config from '@repo/configs/vite.config';

const buildTarget = 'chrome56';

export default defineConfig((env) =>
  mergeConfig<UserConfig, UserConfig>(config(env), {
    base: './',
    plugins: [externalizeDeps()],
    esbuild: {
      target: buildTarget,
    },
    optimizeDeps: {
      esbuildOptions: {
        target: buildTarget,
      },
    },
    build: {
      target: buildTarget,
    },
  }),
);

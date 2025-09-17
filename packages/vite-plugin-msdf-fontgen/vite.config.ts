import config from '@repo/vite-config/lib';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import { externalizeDeps } from 'vite-plugin-externalize-deps';

export default defineConfig((env) =>
  mergeConfig<UserConfig, UserConfig>(config(env), {
    plugins: [externalizeDeps()],
    esbuild: {
      platform: 'node',
      target: 'node22',
    },
    build: {
      target: 'node22',
      rollupOptions: {
        output: {
          globals: {
            'node:fs/promises': 'fs/promises',
            'node:path': 'path',
            'node:fs': 'fs',
          },
        },
      },
    },
  }),
);

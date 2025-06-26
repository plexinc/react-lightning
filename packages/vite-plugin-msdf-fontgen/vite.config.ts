import config from '@repo/vite-config/lib';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';

export default defineConfig((env) =>
  mergeConfig<UserConfig, UserConfig>(config(env), {
    esbuild: {
      platform: 'node',
      target: 'node22',
    },
    build: {
      target: 'node22',
      // lib: {
      //   entry: 'src/index.ts',
      //   name: 'index',
      //   fileName: () => 'index.mjs',
      //   formats: ['es'],
      // },
      rollupOptions: {
        external: [
          '@lightningjs/msdf-generator',
          '@lightningjs/msdf-generator/adjustFont',
          'crc-32',
          'glob',
          'node:fs/promises',
          'node:path',
          'node:fs',
        ],
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

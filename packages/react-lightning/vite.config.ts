import config from '@repo/vite-config/lib';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';

export default defineConfig((env) =>
  mergeConfig<UserConfig, UserConfig>(config(env), {
    build: {
      rollupOptions: {
        external: [
          '@lightningjs/renderer',
          '@lightningjs/renderer/webgl',
          '@lightningjs/renderer/canvas',
          'react',
          'react-reconciler',
          'react/jsx-runtime',
        ],
      },
    },
  }),
);

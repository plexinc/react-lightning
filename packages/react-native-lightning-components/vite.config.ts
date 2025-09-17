import path from 'node:path';
import config from '@repo/vite-config/lib';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import { externalizeDeps } from 'vite-plugin-externalize-deps';

export default defineConfig((env) =>
  mergeConfig<UserConfig, UserConfig>(config(env), {
    plugins: [externalizeDeps()],
    build: {
      lib: {
        entry: 'src/exports/index.ts',
      },
      rollupOptions: {
        output: {
          preserveModules: true,
          preserveModulesRoot: path.join('src', 'exports'),
        },
      },
    },
  }),
);

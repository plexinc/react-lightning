import path from 'node:path';

import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import { externalizeDeps } from 'vite-plugin-externalize-deps';

import config from '@repo/configs/vite.config';

export default defineConfig((env) =>
  mergeConfig<UserConfig, UserConfig>(config(env), {
    plugins: [externalizeDeps()],
    build: {
      lib: {
        entry: 'src/exports/index.ts',
      },
      rolldownOptions: {
        output: {
          preserveModules: true,
          preserveModulesRoot: path.join('src', 'exports'),
        },
      },
    },
  }),
);

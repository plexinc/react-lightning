import path from 'node:path';
import config from '@repo/vite-config/lib';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';

export default defineConfig((env) =>
  mergeConfig<UserConfig, UserConfig>(config(env), {
    build: {
      lib: {
        entry: 'src/exports/index.ts',
      },
      rollupOptions: {
        output: {
          preserveModules: true,
          preserveModulesRoot: path.join('src', 'exports'),
        },
        external: [
          '@plextv/react-lightning',
          '@plextv/react-native-lightning',
          '@shopify/flash-list',
          'react',
          'react-native',
          'react-native-web',
          'react/jsx-runtime',
        ],
      },
    },
  }),
);

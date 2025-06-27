import config from '@repo/vite-config/lib';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';

export default defineConfig((env) =>
  mergeConfig<UserConfig, UserConfig>(config(env), {
    build: {
      rollupOptions: {
        external: [
          'react/jsx-runtime',
          'react',
          'react-native-web',
          '@plextv/react-lightning',
          '@plextv/react-lightning-plugin-css-transform',
          '@plextv/react-lightning-plugin-flexbox',
        ],
      },
    },
  }),
);

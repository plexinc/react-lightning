import config from '@repo/configs/vite.config';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import { externalizeDeps } from 'vite-plugin-externalize-deps';

export default defineConfig((env) =>
  mergeConfig<UserConfig, UserConfig>(config(env), {
    plugins: [
      externalizeDeps({
        include: ['react-native-reanimated-original'],
      }),
    ],
  }),
);

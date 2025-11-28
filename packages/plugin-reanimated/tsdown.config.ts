import baseConfig from '@repo/configs/tsdown.config';
import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  ...baseConfig,
  external: ['react-native-reanimated-original'],
});

export default config;

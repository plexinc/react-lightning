import { defineConfig, type UserConfig } from 'tsdown';
import baseConfig from '../configs/tsdown.config';

const config: UserConfig = defineConfig({
  ...baseConfig,
  external: ['react-native-reanimated-original'],
});

export default config;

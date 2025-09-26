import baseConfig from '@repo/configs/tsdown.config';
import { defineConfig } from 'tsdown';

export default defineConfig({
  ...baseConfig,
  dts: false,
  // noExternal: ['react-native-web'],
});

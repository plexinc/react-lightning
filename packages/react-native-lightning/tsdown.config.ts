import baseConfig from '@repo/configs/tsdown.config';
import { defineConfig } from 'tsdown';

export default defineConfig({
  ...baseConfig,
  // Todo: Figure out why tsdown wants to import the react-native-web types
  // in the final bundle.
  dts: false,
});

import { defineConfig, type UserConfig } from 'tsdown';
import baseConfig from '../configs/tsdown.config';

const config: UserConfig = defineConfig({
  ...baseConfig,
  // Todo: Figure out why tsdown wants to import the react-native-web types
  // in the final bundle.
  // dts: false,
});

export default config;

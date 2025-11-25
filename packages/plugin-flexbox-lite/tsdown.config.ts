import { defineConfig, type UserConfig } from 'tsdown';
import baseConfig from '../configs/tsdown.config';

const config: UserConfig = defineConfig({
  ...baseConfig,
  entry: ['./src/index.ts', './src/types/jsx.d.ts'],
  exports: {
    devExports: true,
    customExports(exports, context) {
      if (context.isPublish) {
        exports['./jsx'] = './dist/types/jsx.d.ts';
      } else {
        exports['./jsx'] = './src/types/jsx.d.ts';
      }

      return exports;
    },
  },
});

export default config;

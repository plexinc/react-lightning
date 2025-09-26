import baseConfig from '@repo/configs/tsdown.config';
import { defineConfig } from 'tsdown';

export default defineConfig({
  ...baseConfig,
  exports: {
    devExports: true,
    customExports(exports, context) {
      if (context.isPublish) {
        exports['./jsx'] = './dist/types/types/jsx.d.ts';
      } else {
        exports['./jsx'] = './src/types/jsx.d.ts';
      }

      return exports;
    },
  },
});

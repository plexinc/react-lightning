import { defineConfig } from 'tsdown';
import baseConfig from './tsdown.config';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts', 'src/exports/**/*.{tsx,ts}'],
  exports: {
    devExports: true,
    customExports(pkg, _context) {
      // Remove 'exports/' prefix from export paths
      return Object.entries(pkg).reduce(
        (acc, [key, value]) => {
          const newKey = key.startsWith('./exports/')
            ? key.replace('./exports/', './')
            : key;

          acc[newKey] = value;

          return acc;
        },
        {} as Record<string, unknown>,
      );
    },
  },
});

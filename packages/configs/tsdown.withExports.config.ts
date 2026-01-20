import { defineConfig, type UserConfig } from 'tsdown';
// @ts-expect-error: Needed for unrun to resolve this module correctly
import baseConfig from './tsdown.config.ts';

const config: UserConfig = defineConfig({
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

export default config;

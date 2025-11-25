import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig[] = defineConfig([
  {
    entry: './src/worker.ts',
    format: 'cjs',
    clean: false,
    target: 'chrome56',
    outputOptions: {
      name: 'worker',
      dir: './src/_generated',
    },
  },
]);

export default config;

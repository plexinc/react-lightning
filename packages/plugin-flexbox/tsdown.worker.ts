import { defineConfig } from 'tsdown';

export default defineConfig([
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

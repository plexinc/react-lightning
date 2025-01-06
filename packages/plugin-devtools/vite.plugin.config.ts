import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/plugin/index.tsx',
      formats: ['es', 'cjs'],
    },
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/plugin.js',
      },
    },
  },
});

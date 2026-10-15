import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';

import fontGen from '@plextv/vite-plugin-msdf-fontgen';

export default {
  plugins: [react(), fontGen({ inputs: [{ src: 'assets/fonts', dest: 'public/msdf' }] })],
  build: {
    outDir: 'dist',
    target: 'es2017',
    sourcemap: false,
    rollupOptions: {
      input: {
        current: resolve(import.meta.dirname, 'current.html'),
        mvp: resolve(import.meta.dirname, 'mvp.html'),
      },
    },
  },
};

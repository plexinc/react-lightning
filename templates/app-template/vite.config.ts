import fontGen from '@plextv/vite-plugin-msdf-fontgen';
import react from '@vitejs/plugin-react';
import type { InlineConfig } from 'vite';

const config: InlineConfig = {
  plugins: [
    react(),
    fontGen({
      inputs: [
        {
          src: 'public/fonts',
          dest: 'public/fonts',
        },
      ],
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
};

export default config;

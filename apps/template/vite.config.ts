import fontGen from '@plex/vite-plugin-msdf-fontgen';
import react from '@vitejs/plugin-react';
import type { InlineConfig } from 'vite';

const config: InlineConfig = {
  plugins: [
    react(),
    fontGen({
      inputDir: 'public/fonts',
      outDir: 'public/fonts',
    }),
  ],
};

export default config;

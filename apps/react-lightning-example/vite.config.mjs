import fontGen from '@plex/vite-plugin-msdf-fontgen';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * @type {import('vite').InlineConfig}
 */
const config = {
  plugins: [
    tsconfigPaths(),
    react(),
    fontGen({
      inputDir: 'public/fonts',
      outDir: 'public/fonts',
    }),
  ],
  server: {
    port: 3333,
    host: true,
  },
  build: {
    outDir: 'dist',
    minify: false,
  },
  optimizeDeps: {
    esbuildOptions: {
      mainFields: ['module', 'main'],
      tsconfig: './tsconfig.json',
    },
    force: true,
  },
};

export default config;

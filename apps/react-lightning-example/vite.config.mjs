import fontGen from '@plextv/vite-plugin-msdf-fontgen';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * @type {import('vite').InlineConfig}
 */
const config = {
  plugins: [
    tsconfigPaths({
      skip: (dir) => dir.includes('app-template'),
    }),
    react(),
    fontGen({
      inputs: [
        {
          src: 'assets/fonts',
          dest: 'public/fonts',
        },
      ],
    }),
    legacy({
      targets: ['chrome>=69'],
      renderModernChunks: false,
    }),
  ],
  server: {
    port: 3333,
    host: true,
    hmr: false,
  },
  build: {
    outDir: 'dist',
    minify: false,
  },
};

export default config;

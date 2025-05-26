import fontGen from '@plextv/vite-plugin-msdf-fontgen';
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
      inputs: [
        {
          src: 'assets/fonts',
          dest: 'public/fonts',
        },
      ],
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
  define: {
    'process.env': JSON.stringify({
      NODE_ENV: process.env.NODE_ENV,
    }),
  },
};

export default config;

import { type ManifestV3Export, crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), crx({ manifest: manifest as ManifestV3Export })],
  server: { port: 3000, hmr: { port: 3000 } },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        extension: 'src/web-extension/extension.html',
      },
    },
  },
});

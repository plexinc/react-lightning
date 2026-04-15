import babel from '@rolldown/plugin-babel';
import legacy from '@vitejs/plugin-legacy';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';

import fontGen from '@plextv/vite-plugin-msdf-fontgen';

/**
 * @type {import('vite').InlineConfig}
 */
const config = {
  plugins: [
    react(),
    // React Compiler. @vitejs/plugin-react v6 dropped its built-in Babel
    // pipeline in favour of oxc, so the legacy `react({ babel: { plugins: [...] } })`
    // config is silently ignored. The compiler runs through @rolldown/plugin-babel
    // with the preset exposed by @vitejs/plugin-react.
    babel({ presets: [reactCompilerPreset()] }),
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

import babel from '@rolldown/plugin-babel';
import legacy from '@vitejs/plugin-legacy';
import { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import fontGen from '@plextv/vite-plugin-msdf-fontgen';
import reactNativeLightningPlugin from '@plextv/vite-plugin-react-native-lightning';
import reactReanimatedLightningPlugin from '@plextv/vite-plugin-react-reanimated-lightning';

const config = defineConfig((env) => ({
  base: './',
  plugins: [
    reactNativeLightningPlugin(),
    // React Compiler. @vitejs/plugin-react v6 uses oxc and ignores any
    // `babel` option, so the compiler runs through @rolldown/plugin-babel
    // with the preset exported by @vitejs/plugin-react.
    babel({ presets: [reactCompilerPreset()] }),
    reactReanimatedLightningPlugin(),
    fontGen({
      inputs: [
        {
          src: 'public/fonts',
          dest: 'public/fonts',
        },
      ],
    }),
    legacy({
      targets: ['chrome>=69'],
      renderModernChunks: false,
    }),
  ],
  build: {
    minify: false,
  },
  server: {
    host: true,
    port: 3333,
    hmr: false,
  },
  define: {
    __DEV__: JSON.stringify((env.mode ?? process.env.NODE_ENV) !== 'production'),
    'process.env.NODE_ENV': JSON.stringify(env.mode),
  },
}));

export default config;

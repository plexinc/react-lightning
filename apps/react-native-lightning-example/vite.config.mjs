import legacy from '@vitejs/plugin-legacy';
import { defineConfig } from 'vite';

import fontGen from '@plextv/vite-plugin-msdf-fontgen';
import reactNativeLightningPlugin from '@plextv/vite-plugin-react-native-lightning';
import reactReanimatedLightningPlugin from '@plextv/vite-plugin-react-reanimated-lightning';

const config = defineConfig((env) => ({
  base: './',
  plugins: [
    reactNativeLightningPlugin({
      reactOptions: {
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      },
    }),
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

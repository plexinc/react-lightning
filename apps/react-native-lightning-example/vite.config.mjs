import fontGen from '@plextv/vite-plugin-msdf-fontgen';
import reactNativeLightningPlugin from '@plextv/vite-plugin-react-native-lightning';
import reactReanimatedLightningPlugin from '@plextv/vite-plugin-react-reanimated-lightning';
import legacy from '@vitejs/plugin-legacy';
import { defineConfig } from 'vite';

const config = defineConfig({
  base: './',
  plugins: [
    reactNativeLightningPlugin(),
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
    'process.env': JSON.stringify({
      NODE_ENV: process.env.NODE_ENV,
    }),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});

export default config;

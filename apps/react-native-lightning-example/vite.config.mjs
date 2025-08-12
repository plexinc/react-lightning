import fontGen from '@plextv/vite-plugin-msdf-fontgen';
import reactNativeLightningPlugin from '@plextv/vite-plugin-react-native-lightning';
import reactReanimatedLightningPlugin from '@plextv/vite-plugin-react-reanimated-lightning';
import legacy from '@vitejs/plugin-legacy';
import { defineConfig } from 'vite';

const config = defineConfig((env) => ({
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
    __DEV__: JSON.stringify(
      (env.mode ?? process.env.NODE_ENV) !== 'production',
    ),
    'process.env.NODE_ENV': JSON.stringify(env.mode),
  },
}));

export default config;

import fontGen from '@plextv/vite-plugin-msdf-fontgen';
import reactNativeLightningPlugin from '@plextv/vite-plugin-react-native-lightning';
import reactReanimatedLightningPlugin from '@plextv/vite-plugin-react-reanimated-lightning';
import { defineConfig } from 'vite';

const config = defineConfig({
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
  ],
  server: {
    host: true,
    port: 3333,
  },
  define: {
    'process.env': JSON.stringify({
      NODE_ENV: process.env.NODE_ENV,
    }),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});

export default config;

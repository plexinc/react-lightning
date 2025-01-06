import fontGen from '@plex/vite-plugin-msdf-fontgen';
import reactNativeLightningPlugin from '@plex/vite-plugin-react-native-lightning';
import reactReanimatedLightningPlugin from '@plex/vite-plugin-react-reanimated-lightning';
import { defineConfig } from 'vite';

const config = defineConfig({
  plugins: [
    reactNativeLightningPlugin(),
    reactReanimatedLightningPlugin(),
    fontGen({
      inputDir: 'public/fonts',
      outDir: 'public/fonts',
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
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
});

export default config;

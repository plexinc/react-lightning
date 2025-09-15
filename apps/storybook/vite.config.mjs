import fontGen from '@plextv/vite-plugin-msdf-fontgen';
import reactNativeLightningPlugin from '@plextv/vite-plugin-react-native-lightning';
import reactReanimatedLightningPlugin from '@plextv/vite-plugin-react-reanimated-lightning';
import { defineConfig } from 'vite';

/**
 * @type {import('vite').InlineConfig}
 */
const config = defineConfig((env) => ({
  base: './',

  define: {
    __DEV__: JSON.stringify(
      (env.mode ?? process.env.NODE_ENV) !== 'production',
    ),
    'process.env.NODE_ENV': JSON.stringify(env.mode),
  },

  plugins: [
    reactNativeLightningPlugin(),
    reactReanimatedLightningPlugin(),
    fontGen({
      inputs: [
        {
          src: 'public/fonts',
          dest: 'public/fonts',
          charset:
            ' !\\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~’“”←↑→↓',
        },
      ],
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
}));

export default config;

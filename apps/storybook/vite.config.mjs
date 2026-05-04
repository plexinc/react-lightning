import babel from '@rolldown/plugin-babel';
import { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import fontGen from '@plextv/vite-plugin-msdf-fontgen';
import reactNativeLightningPlugin from '@plextv/vite-plugin-react-native-lightning';
import reactReanimatedLightningPlugin from '@plextv/vite-plugin-react-reanimated-lightning';

/**
 * @type {import('vite').InlineConfig}
 */
const config = defineConfig((env) => ({
  base: './',

  define: {
    __DEV__: JSON.stringify((env.mode ?? process.env.NODE_ENV) !== 'production'),
    'process.env.NODE_ENV': JSON.stringify(env.mode),
  },

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
          charset:
            ' !\\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~’“”←↑→↓',
        },
      ],
    }),
  ],

  optimizeDeps: {
    // plugin-flexbox uses a ?worker&inline Vite import that rolldown's
    // dep optimizer can't resolve. Exclude it so Vite handles it via its
    // normal transform pipeline instead.
    exclude: ['@plextv/react-lightning-plugin-flexbox'],
  },

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

import fontGen from '@plextv/vite-plugin-msdf-fontgen';
import reactNativeLightningPlugin from '@plextv/vite-plugin-react-native-lightning';
import reactReanimatedLightningPlugin from '@plextv/vite-plugin-react-reanimated-lightning';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal(config) {
    config.define = {
      'process.env': JSON.stringify({
        NODE_ENV: process.env.NODE_ENV,
      }),
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    };

    config.plugins = [
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
      ...(config.plugins ?? []),
    ];

    return config;
  },
  core: {
    disableTelemetry: true,
  },
};

export default config;

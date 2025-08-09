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
      __DEV__: JSON.stringify(
        (config.mode ?? process.env.NODE_ENV) !== 'production',
      ),
      'process.env.NODE_ENV': JSON.stringify(config.mode),
    };

    config.plugins = [
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
      ...(config.plugins ?? []),
    ];

    return config;
  },
  core: {
    disableTelemetry: true,
  },
};

export default config;

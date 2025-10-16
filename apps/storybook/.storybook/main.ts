import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  staticDirs: ['../public'],
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-docs'],
  framework: '@storybook/react-vite',

  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },

  managerHead: (head) => `
    ${head}
    <style>
      .sidebar-item[data-selected="true"] {
        color: rgb(28, 28, 28) !important;
      }
    </style>
  `,

  core: {
    disableTelemetry: true,
  },
};

export default config;

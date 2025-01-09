import type { Preview } from '@storybook/react';
import React from 'react';
import { StorybookDecorator } from '../src/components/StorybookDecorator';
import theme from './theme';

const preview: Preview = {
  parameters: {
    docs: {
      theme,
    },
    options: {
      storySort: {
        order: [
          'Getting Started',
          ['Introduction', 'Quick Start'],
          '@plexinc∕react-lightning',
          '@plexinc∕react-native-lightning',
          '@plexinc∕react-lightning-components',
          'Plugins',
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story, context) =>
      context.tags.includes('overrideDecorator') ? (
        <Story />
      ) : (
        <StorybookDecorator story={Story} />
      ),
  ],
};

export default preview;

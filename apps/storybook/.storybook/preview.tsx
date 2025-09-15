import type { Preview } from '@storybook/react-vite';
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
          'react-lightning',
          'react-lightning-components',
          'react-native-lightning',
          'react-native-lightning-components',
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
        <StorybookDecorator story={Story} tags={context.tags} />
      ),
  ],
};

export default preview;

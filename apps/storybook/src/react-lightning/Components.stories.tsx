import type { Meta } from '@storybook/react';

export default {
  title: '@plextv∕react-lightning/Lightning Components',
  component: () => <lng-view />,
  tags: ['!dev'],
} as Meta;

export const Primitives = () => (
  <lng-view>
    <lng-image src="https://picsum.photos/300/300" />
    <lng-text>Hello, World!</lng-text>
  </lng-view>
);

export const Styling = () => (
  <lng-view
    style={{ color: 0xff00ff55, width: 500, height: 100, borderRadius: 20 }}
  >
    <lng-text style={{ fontSize: 50, mount: 0.5, x: 250, y: 50 }}>
      I've got some style
    </lng-text>
  </lng-view>
);

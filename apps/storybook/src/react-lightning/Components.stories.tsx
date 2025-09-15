import type { Meta } from '@storybook/react-vite';

export default {
  title: 'react-lightning/Lightning Components',
  component: () => <lng-view />,
  tags: ['!dev'],
} as Meta;

export const Primitives = () => (
  <lng-view>
    <lng-text style={{ color: 0xffffffff }}>Hello, World!</lng-text>
    <lng-image style={{ y: 50 }} src="https://picsum.photos/300/300" />
  </lng-view>
);

export const Styling = () => (
  <lng-view style={{ color: 0xff00ff55, w: 500, h: 100, borderRadius: 20 }}>
    <lng-text
      style={{ color: 0xffff00ff, fontSize: 50, mount: 0.5, x: 250, y: 50 }}
    >
      I've got some style
    </lng-text>
  </lng-view>
);

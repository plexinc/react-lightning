import type { Meta } from '@storybook/react';
import type { FC } from 'react';

type Props = {
  rtt?: boolean;
};

const View: FC<Props> = (props) => <lng-view {...props} />;

export default {
  title: '@plex∕react-lightning/Examples/Render/Render To Texture',
  component: View,
  argTypes: {
    rtt: {
      type: { name: 'boolean', required: false },
      description: 'Render To Texture',
      control: {
        type: 'boolean',
      },
    },
  },
} as Meta<typeof View>;

const content = (
  <lng-view style={{ width: 700, height: 400, color: 0xff00ffff }}>
    <lng-image
      src="https://picsum.photos/600/400"
      style={{ width: 600, x: 40, y: 40, height: 400 }}
    />
    <lng-text
      text="Hello world"
      style={{
        color: 0xffff44ff,
        x: 200,
        y: 100,
        fontSize: 100,
      }}
    />
  </lng-view>
);

export const WithRtt = ({ rtt }: Props) => (
  <lng-view
    style={{ width: 600, height: 400, color: 0xffffffff, borderRadius: 20 }}
    rtt={rtt}
  >
    {content}
  </lng-view>
);

WithRtt.args = {
  rtt: true,
};

export const WithoutRtt = ({ rtt }: Props) => (
  <lng-view
    style={{ width: 600, height: 400, color: 0xffffffff, borderRadius: 20 }}
    rtt={rtt}
  >
    {content}
  </lng-view>
);

WithoutRtt.args = {
  rtt: false,
};

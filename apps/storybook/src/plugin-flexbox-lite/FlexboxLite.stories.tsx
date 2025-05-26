import { Row } from '@plextv/react-lightning-components';
import flexboxLitePlugin from '@plextv/react-lightning-plugin-flexbox-lite';
import type { Meta } from '@storybook/react';
import { StorybookDecorator } from '../components/StorybookDecorator';
import {
  ColorPalette,
  DefaultStoryHeight,
  DefaultStoryWidth,
  FlexTypes,
} from '../helpers/constants';

type RowLayoutProps = {
  flexType?: FlexTypes;
};

const ExampleBox = () => {
  const color = ColorPalette[Math.floor(Math.random() * ColorPalette.length)];
  return (
    <lng-view style={{ width: 150, height: 150, color }}>
      <lng-text
        style={{
          fontSize: 20,
          color: 0xffffffff,
          left: 20,
          top: 20,
        }}
      >
        Example Box
      </lng-text>
    </lng-view>
  );
};

export default {
  title: 'Plugins/@plextv∕react-lightning-plugin-flexbox-lite/FlexBoxLite',
  decorators: [
    (Story) => (
      <StorybookDecorator
        story={Story}
        canvasOptions={{ plugins: [flexboxLitePlugin()] }}
      />
    ),
  ],
  argTypes: {
    flexType: {
      type: { name: 'string', required: false },
      description: 'Flex Type',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: FlexTypes.FLEX_START },
      },
      options: [
        FlexTypes.FLEX_START,
        FlexTypes.FLEX_END,
        FlexTypes.SPACE_EVENLY,
        FlexTypes.SPACE_BETWEEN,
        FlexTypes.SPACE_AROUND,
      ],
      control: {
        type: 'select',
        labels: {
          flexStart: FlexTypes.FLEX_START,
          flexEnd: FlexTypes.FLEX_END,
          spaceEvenly: FlexTypes.SPACE_EVENLY,
          spaceBetween: FlexTypes.SPACE_BETWEEN,
          spaceAround: FlexTypes.SPACE_AROUND,
        },
      },
    },
  },
} as Meta<typeof Row>;

// The rest of the story definitions
export const FlexStart = ({ flexType }: RowLayoutProps) => {
  return (
    <Row
      focusable
      style={{
        justifyContent: flexType ?? FlexTypes.FLEX_START,
        gap: 10,
        width: DefaultStoryWidth,
        height: DefaultStoryHeight,
        color: 0xcccc00ff,
      }}
    >
      <ExampleBox />
      <ExampleBox />
      <ExampleBox />
    </Row>
  );
};

FlexStart.args = {
  flexType: FlexTypes.FLEX_START,
};

export const FlexEnd = ({ flexType }: RowLayoutProps) => {
  return (
    <Row
      focusable
      style={{
        justifyContent: flexType ?? FlexTypes.FLEX_END,
        gap: 10,
        width: DefaultStoryWidth,
        height: DefaultStoryHeight,
        color: 0xcccc00ff,
      }}
    >
      <ExampleBox />
      <ExampleBox />
      <ExampleBox />
    </Row>
  );
};

FlexEnd.args = {
  flexType: FlexTypes.FLEX_END,
};

export const SpaceEvenly = ({ flexType }: RowLayoutProps) => {
  return (
    <Row
      focusable
      style={{
        justifyContent: flexType ?? FlexTypes.SPACE_EVENLY,
        gap: 10,
        width: DefaultStoryWidth,
        height: DefaultStoryHeight,
        color: 0xcccc00ff,
      }}
    >
      <ExampleBox />
      <ExampleBox />
      <ExampleBox />
    </Row>
  );
};

SpaceEvenly.args = {
  flexType: FlexTypes.SPACE_EVENLY,
};

export const SpaceBetween = ({ flexType }: RowLayoutProps) => {
  return (
    <Row
      focusable
      style={{
        justifyContent: flexType ?? FlexTypes.SPACE_BETWEEN,
        gap: 10,
        width: DefaultStoryWidth,
        height: DefaultStoryHeight,
        color: 0xcccc00ff,
      }}
    >
      <ExampleBox />
      <ExampleBox />
      <ExampleBox />
    </Row>
  );
};

SpaceBetween.args = {
  flexType: FlexTypes.SPACE_BETWEEN,
};

export const SpaceAround = ({ flexType }: RowLayoutProps) => {
  return (
    <Row
      focusable
      style={{
        justifyContent: flexType ?? FlexTypes.SPACE_AROUND,
        gap: 10,
        width: DefaultStoryWidth,
        height: DefaultStoryHeight,
        color: 0xcccc00ff,
      }}
    >
      <ExampleBox />
      <ExampleBox />
      <ExampleBox />
    </Row>
  );
};

SpaceAround.args = {
  flexType: FlexTypes.SPACE_AROUND,
};

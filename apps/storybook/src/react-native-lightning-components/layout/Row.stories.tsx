import { Row } from '@plextv/react-native-lightning-components';
import type { Meta } from '@storybook/react';
import {
  ColorPalette,
  DefaultStoryHeight,
  DefaultStoryWidth,
  FlexTypes,
} from '../../helpers/constants';

type RowLayoutProps = {
  justifyContent?: FlexTypes;
};

const ExampleBox = () => {
  // Get random color from the ColorPalette.
  const color = ColorPalette[Math.floor(Math.random() * ColorPalette.length)];
  return <lng-view style={{ width: 125, height: 125, color }} />;
};

export default {
  title: '@plextv∕react-native-lightning-components/Layout/Row',
  component: Row,
  argTypes: {
    justifyContent: {
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
  tags: ['reactNative'],
} as Meta<typeof Row>;

// The rest of the story definitions
export const FlexStart = ({
  justifyContent = FlexTypes.FLEX_START,
}: RowLayoutProps) => {
  return (
    <Row
      focusable
      style={{
        justifyContent,
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
  justifyContent: FlexTypes.FLEX_START,
};

export const FlexEnd = ({
  justifyContent = FlexTypes.FLEX_END,
}: RowLayoutProps) => {
  return (
    <Row
      focusable
      style={{
        justifyContent,
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
  justifyContent: FlexTypes.FLEX_END,
};

export const SpaceEvenly = ({
  justifyContent = FlexTypes.SPACE_EVENLY,
}: RowLayoutProps) => {
  return (
    <Row
      focusable
      style={{
        justifyContent,
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
  justifyContent: FlexTypes.SPACE_EVENLY,
};

export const SpaceBetween = ({
  justifyContent = FlexTypes.SPACE_BETWEEN,
}: RowLayoutProps) => {
  return (
    <Row
      focusable
      style={{
        justifyContent,
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
  justifyContent: FlexTypes.SPACE_BETWEEN,
};

export const SpaceAround = ({
  justifyContent = FlexTypes.SPACE_AROUND,
}: RowLayoutProps) => {
  return (
    <Row
      focusable
      style={{
        justifyContent,
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
  justifyContent: FlexTypes.SPACE_AROUND,
};

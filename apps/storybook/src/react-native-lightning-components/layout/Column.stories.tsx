import { Column } from '@plextv/react-native-lightning-components';
import type { Meta } from '@storybook/react';
import {
  ColorPalette,
  DefaultStoryHeight,
  DefaultStoryWidth,
  FlexTypes,
} from '../../helpers/constants';

type ColumnLayoutProps = {
  justifyContent?: FlexTypes;
};

const ExampleBox = () => {
  // Get random color from the ColorPalette.
  const color = ColorPalette[Math.floor(Math.random() * ColorPalette.length)];
  return <lng-view style={{ width: 125, height: 125, color }} />;
};

export default {
  title: '@plextv∕react-native-lightning-components/Layout/Column',
  component: Column,
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
} as Meta<typeof Column>;

export const FlexStart = ({
  justifyContent = FlexTypes.FLEX_START,
}: ColumnLayoutProps) => {
  return (
    <Column
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
    </Column>
  );
};

FlexStart.args = {
  justifyContent: FlexTypes.FLEX_START,
};

export const FlexEnd = ({
  justifyContent = FlexTypes.FLEX_END,
}: ColumnLayoutProps) => {
  return (
    <Column
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
    </Column>
  );
};

FlexEnd.args = {
  justifyContent: FlexTypes.FLEX_END,
};

export const SpaceEvenly = ({
  justifyContent = FlexTypes.SPACE_EVENLY,
}: ColumnLayoutProps) => {
  return (
    <Column
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
    </Column>
  );
};

SpaceEvenly.args = {
  justifyContent: FlexTypes.SPACE_EVENLY,
};

export const SpaceBetween = ({
  justifyContent = FlexTypes.SPACE_BETWEEN,
}: ColumnLayoutProps) => {
  return (
    <Column
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
    </Column>
  );
};

SpaceBetween.args = {
  justifyContent: FlexTypes.SPACE_BETWEEN,
};

export const SpaceAround = ({
  justifyContent = FlexTypes.SPACE_AROUND,
}: ColumnLayoutProps) => {
  return (
    <Column
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
    </Column>
  );
};

SpaceAround.args = {
  justifyContent: FlexTypes.SPACE_AROUND,
};

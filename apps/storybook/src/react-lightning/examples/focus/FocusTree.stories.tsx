import { Column, Row } from '@plex/react-lightning-components';
import type { Meta } from '@storybook/react';
import Button from '../../../components/Button';

export default {
  title: '@plex∕react-lightning/Examples/Focus/Focus Tree',
  argTypes: {},
} as Meta;

const focusedBorder = { color: 0xffffffff, width: 3 };

export const SimpleFocusTree = () => {
  const getStyle = (color: number) => ({
    gap: 16,
    padding: 16,
    color,
    border: { color: 0, width: 0 },
  });
  const getFocusedStyle = (color: number) => ({ color, border: focusedBorder });
  const textStyle = {
    fontSize: 32,
  };

  return (
    <Column key="root" focusable style={{ gap: 16 }}>
      <Row
        focusable
        style={getStyle(0xff00ff20)}
        focusedStyle={getFocusedStyle(0xff00ff40)}
      >
        <Button>Top-A</Button>
        <Column
          focusable
          style={getStyle(0xffff0088)}
          focusedStyle={getFocusedStyle(0xffff00aa)}
        >
          <lng-text style={textStyle}>Top-B</lng-text>
          <Row style={{ gap: 16 }}>
            <Button>Top-B-1</Button>
            <Button>Top-B-2</Button>
          </Row>
        </Column>
        <Button>Top-C</Button>
      </Row>
      <Row
        focusable
        style={getStyle(0x00ffff20)}
        focusedStyle={getFocusedStyle(0x00ffff40)}
      >
        <Button>Bottom-A</Button>
        <Button>Bottom-B</Button>
        <Button>Bottom-C</Button>
      </Row>
    </Column>
  );
};

import { FocusGroup } from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import type { Meta } from '@storybook/react-vite';
import {
  FocusableImage,
  type FocusableImageProps,
} from '../../../components/FocusableImage';

export default {
  title: 'react-lightning/Examples/Focus/TrapFocus',
} as Meta;

const TrappableImage = ({
  trapFocusUp,
  trapFocusRight,
  trapFocusDown,
  trapFocusLeft,
  width,
  height,
  x,
  y,
  style,
  ...props
}: FocusableImageProps & {
  width: number;
  height: number;
  x: number;
  y: number;
  trapFocusUp?: boolean;
  trapFocusRight?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
}) => {
  return (
    <FocusGroup
      style={{
        w: width,
        h: height,
        x: x,
        y: y,
      }}
      trapFocusUp={trapFocusUp}
      trapFocusRight={trapFocusRight}
      trapFocusDown={trapFocusDown}
      trapFocusLeft={trapFocusLeft}
    >
      <FocusableImage
        {...props}
        style={{
          w: width,
          h: height,
          borderColor: 0xff0000ff,
          borderRight: trapFocusRight ? 5 : 0,
          borderBottom: trapFocusDown ? 5 : 0,
          borderLeft: trapFocusLeft ? 5 : 0,
          borderTop: trapFocusUp ? 5 : 0,
          ...style,
        }}
      />
    </FocusGroup>
  );
};

export const TrapFocus = () => {
  return (
    <>
      <TrappableImage width={75} height={75} x={10} y={10} />
      <TrappableImage width={75} height={75} x={95} y={10} />
      <TrappableImage
        width={75}
        height={75}
        x={180}
        y={10}
        trapFocusRight
        trapFocusDown
      />
      <TrappableImage width={75} height={75} x={265} y={10} trapFocusDown />
      <TrappableImage width={75} height={75} x={350} y={10} />

      <TrappableImage width={75} height={75} x={10} y={95} />
      <TrappableImage width={75} height={75} x={95} y={95} />
      <TrappableImage width={75} height={75} x={180} y={95} trapFocusLeft />
      <TrappableImage width={75} height={75} x={265} y={95} autoFocus />
      <TrappableImage width={75} height={75} x={350} y={95} trapFocusLeft />

      <TrappableImage width={75} height={75} x={10} y={180} trapFocusUp />
      <TrappableImage width={75} height={75} x={95} y={180} trapFocusRight />
      <TrappableImage width={75} height={75} x={180} y={180} />
      <TrappableImage width={75} height={75} x={265} y={180} trapFocusUp />
      <TrappableImage width={75} height={75} x={350} y={180} />

      <TrappableImage width={75} height={75} x={10} y={265} />
      <TrappableImage
        width={75}
        height={75}
        x={95}
        y={265}
        trapFocusUp
        trapFocusRight
        trapFocusDown
      />
      <TrappableImage width={75} height={75} x={180} y={265} />
      <TrappableImage width={75} height={75} x={265} y={265} trapFocusRight />
      <TrappableImage width={75} height={75} x={350} y={265} />

      <TrappableImage width={75} height={75} x={10} y={350} />
      <TrappableImage width={75} height={75} x={95} y={350} />
      <TrappableImage width={75} height={75} x={180} y={350} trapFocusRight />
      <TrappableImage width={75} height={75} x={265} y={350} />
      <TrappableImage width={75} height={75} x={350} y={350} trapFocusUp />
    </>
  );
};

export const TrapFocusGroups = () => {
  return (
    <Column style={{ gap: 10, x: 10, y: 10, w: 475 }}>
      <Row focusable style={{ gap: 10 }}>
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
      </Row>

      <Row
        focusable
        trapFocusDown
        style={{
          gap: 10,
          paddingBottom: 10,
          borderColor: 0xff0000ff,
          borderBottom: 5,
        }}
      >
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
      </Row>

      <Row focusable style={{ gap: 10 }}>
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
        <FocusableImage style={{ w: 75, h: 75 }} />
      </Row>
    </Column>
  );
};

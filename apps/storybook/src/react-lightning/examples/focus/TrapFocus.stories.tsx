import { FocusGroup, type LightningElement } from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import type { Meta } from '@storybook/react';
import {
  FocusableImage,
  type FocusableImageProps,
} from '../../../components/FocusableImage';

export default {
  title: 'react-lightning/Examples/Focus/TrapFocus',
} as Meta;

const trapUpStyle: LightningElement['style'] = {
  borderColor: 0xff0000ff,
  borderTop: 5,
};
const trapRightStyle: LightningElement['style'] = {
  borderColor: 0xff0000ff,
  borderRight: 5,
};
const trapDownStyle: LightningElement['style'] = {
  borderColor: 0xff0000ff,
  borderBottom: 5,
};
const trapLeftStyle: LightningElement['style'] = {
  borderColor: 0xff0000ff,
  borderLeft: 5,
};

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
        width: width,
        height: height,
        x: x,
        y: y,
      }}
      trapFocusUp={trapFocusUp}
      trapFocusRight={trapFocusRight}
      trapFocusDown={trapFocusDown}
      trapFocusLeft={trapFocusLeft}
    >
      <FocusableImage {...props} style={{ width, height, ...style }} />
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
        style={{
          ...trapRightStyle,
          ...trapDownStyle,
        }}
      />
      <TrappableImage
        width={75}
        height={75}
        x={265}
        y={10}
        trapFocusDown
        style={trapDownStyle}
      />
      <TrappableImage width={75} height={75} x={350} y={10} />

      <TrappableImage width={75} height={75} x={10} y={95} />
      <TrappableImage width={75} height={75} x={95} y={95} />
      <TrappableImage
        width={75}
        height={75}
        x={180}
        y={95}
        trapFocusLeft
        style={trapLeftStyle}
      />
      <TrappableImage width={75} height={75} x={265} y={95} autoFocus />
      <TrappableImage
        width={75}
        height={75}
        x={350}
        y={95}
        trapFocusLeft
        style={trapLeftStyle}
      />

      <TrappableImage
        width={75}
        height={75}
        x={10}
        y={180}
        trapFocusUp
        style={trapUpStyle}
      />
      <TrappableImage
        width={75}
        height={75}
        x={95}
        y={180}
        trapFocusRight
        style={trapRightStyle}
      />
      <TrappableImage width={75} height={75} x={180} y={180} />
      <TrappableImage
        width={75}
        height={75}
        x={265}
        y={180}
        trapFocusUp
        style={trapUpStyle}
      />
      <TrappableImage width={75} height={75} x={350} y={180} />

      <TrappableImage width={75} height={75} x={10} y={265} />
      <TrappableImage
        width={75}
        height={75}
        x={95}
        y={265}
        style={{
          ...trapUpStyle,
          ...trapRightStyle,
          ...trapDownStyle,
        }}
        trapFocusUp
        trapFocusRight
        trapFocusDown
      />
      <TrappableImage width={75} height={75} x={180} y={265} />
      <TrappableImage
        width={75}
        height={75}
        x={265}
        y={265}
        trapFocusRight
        style={trapRightStyle}
      />
      <TrappableImage width={75} height={75} x={350} y={265} />

      <TrappableImage width={75} height={75} x={10} y={350} />
      <TrappableImage width={75} height={75} x={95} y={350} />
      <TrappableImage
        width={75}
        height={75}
        x={180}
        y={350}
        trapFocusRight
        style={trapRightStyle}
      />
      <TrappableImage width={75} height={75} x={265} y={350} />
      <TrappableImage
        width={75}
        height={75}
        x={350}
        y={350}
        trapFocusUp
        style={trapUpStyle}
      />
    </>
  );
};

export const TrapFocusGroups = () => {
  return (
    <Column style={{ gap: 10, x: 10, y: 10, width: 475 }}>
      <Row focusable style={{ gap: 10 }}>
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
      </Row>

      <Row
        focusable
        trapFocusDown
        style={{ gap: 10, paddingBottom: 10, ...trapDownStyle }}
      >
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
      </Row>

      <Row focusable style={{ gap: 10 }}>
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
        <FocusableImage style={{ width: 75, height: 75 }} />
      </Row>
    </Column>
  );
};

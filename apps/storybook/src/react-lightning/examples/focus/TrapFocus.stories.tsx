import type { LightningElement } from '@plex/react-lightning';
import { Column, Row } from '@plex/react-lightning-components';
import type { Meta } from '@storybook/react';
import { FocusableImage } from '../../../components/FocusableImage';

export default {
  title: '@plex∕react-lightning/Examples/Focus/TrapFocus',
} as Meta;

const trapUpStyle: LightningElement['style'] = {
  borderTop: { width: 5, color: 0xff0000ff },
};
const trapRightStyle: LightningElement['style'] = {
  borderRight: { width: 5, color: 0xff0000ff },
};
const trapDownStyle: LightningElement['style'] = {
  borderBottom: { width: 5, color: 0xff0000ff },
};
const trapLeftStyle: LightningElement['style'] = {
  borderLeft: { width: 5, color: 0xff0000ff },
};

export const TrapFocus = () => {
  return (
    <>
      <FocusableImage style={{ width: 75, height: 75, x: 10, y: 10 }} />
      <FocusableImage style={{ width: 75, height: 75, x: 95, y: 10 }} />
      <FocusableImage
        style={{
          width: 75,
          height: 75,
          x: 180,
          y: 10,
          ...trapRightStyle,
          ...trapDownStyle,
        }}
        trapFocusRight
        trapFocusDown
      />
      <FocusableImage
        style={{ width: 75, height: 75, x: 265, y: 10, ...trapDownStyle }}
        trapFocusDown
      />
      <FocusableImage style={{ width: 75, height: 75, x: 350, y: 10 }} />

      <FocusableImage style={{ width: 75, height: 75, x: 10, y: 95 }} />
      <FocusableImage style={{ width: 75, height: 75, x: 95, y: 95 }} />
      <FocusableImage
        style={{ width: 75, height: 75, x: 180, y: 95, ...trapLeftStyle }}
        trapFocusLeft
      />
      <FocusableImage
        style={{ width: 75, height: 75, x: 265, y: 95 }}
        autoFocus
      />
      <FocusableImage
        style={{ width: 75, height: 75, x: 350, y: 95, ...trapLeftStyle }}
        trapFocusLeft
      />

      <FocusableImage
        style={{ width: 75, height: 75, x: 10, y: 180, ...trapUpStyle }}
        trapFocusUp
      />
      <FocusableImage
        style={{ width: 75, height: 75, x: 95, y: 180, ...trapRightStyle }}
        trapFocusRight
      />
      <FocusableImage style={{ width: 75, height: 75, x: 180, y: 180 }} />
      <FocusableImage
        style={{ width: 75, height: 75, x: 265, y: 180, ...trapUpStyle }}
        trapFocusUp
      />
      <FocusableImage style={{ width: 75, height: 75, x: 350, y: 180 }} />

      <FocusableImage style={{ width: 75, height: 75, x: 10, y: 265 }} />
      <FocusableImage
        style={{
          width: 75,
          height: 75,
          x: 95,
          y: 265,
          ...trapUpStyle,
          ...trapRightStyle,
          ...trapDownStyle,
        }}
        trapFocusUp
        trapFocusRight
        trapFocusDown
      />
      <FocusableImage style={{ width: 75, height: 75, x: 180, y: 265 }} />
      <FocusableImage
        style={{ width: 75, height: 75, x: 265, y: 265, ...trapRightStyle }}
        trapFocusRight
      />
      <FocusableImage style={{ width: 75, height: 75, x: 350, y: 265 }} />

      <FocusableImage style={{ width: 75, height: 75, x: 10, y: 350 }} />
      <FocusableImage style={{ width: 75, height: 75, x: 95, y: 350 }} />
      <FocusableImage
        style={{ width: 75, height: 75, x: 180, y: 350, ...trapRightStyle }}
        trapFocusRight
      />
      <FocusableImage style={{ width: 75, height: 75, x: 265, y: 350 }} />
      <FocusableImage
        style={{ width: 75, height: 75, x: 350, y: 350, ...trapUpStyle }}
        trapFocusUp
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

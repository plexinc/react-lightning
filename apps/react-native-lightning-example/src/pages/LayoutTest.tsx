import { type LightningImageElement, focusable } from '@plex/react-lightning';
import { Column, Row } from '@plex/react-lightning-components';
import type { ForwardedRef } from 'react';
import { useMemo } from 'react';

const RandomImage = focusable<{ autoFocus?: boolean }>(({ focused }, ref) => {
  const seed = useMemo(() => Math.random() * 10000, []);

  return (
    <lng-image
      ref={ref as ForwardedRef<LightningImageElement>}
      src={`https://picsum.photos/200/300?seed=${seed}`}
      style={{ scale: focused ? 1.25 : 1 }}
      transition={{ scale: { duration: 150 } }}
    />
  );
});

const LayoutTest = () => {
  return (
    <Column
      focusable
      style={{
        justifyContent: 'space-between',
        width: 1670,
        height: 1080,
      }}
    >
      <Row
        focusable
        style={{
          justifyContent: 'space-between',
          width: 1670,
          height: 300,
        }}
      >
        <RandomImage />
        <RandomImage />
      </Row>
      <Row
        focusable
        style={{
          justifyContent: 'center',
          width: 1670,
          height: 300,
        }}
      >
        <RandomImage />
        <RandomImage />
        <RandomImage />
        <RandomImage />
      </Row>
      <Row
        focusable
        style={{
          justifyContent: 'space-evenly',
          width: 1670,
          height: 300,
        }}
      >
        <RandomImage />
        <RandomImage />
        <RandomImage />
        <RandomImage />
        <RandomImage />
      </Row>
    </Column>
  );
};

export { LayoutTest };

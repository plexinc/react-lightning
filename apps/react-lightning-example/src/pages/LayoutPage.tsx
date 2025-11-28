import { focusable, type LightningImageElement } from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import type { FC, ForwardedRef } from 'react';
import { useEffect, useMemo } from 'react';

const RandomImage = focusable<{ autoFocus?: boolean }>(({ focused }, ref) => {
  const seed = useMemo(() => Math.random() * 10000, []);

  useEffect(() => {
    console.log('Render');
  });

  return (
    <lng-image
      ref={ref as ForwardedRef<LightningImageElement>}
      src={`https://picsum.photos/200/300?seed=${seed}`}
      style={{ scale: focused ? 1.25 : 1 }}
      transition={{ scale: { duration: 150 } }}
    />
  );
});

export const LayoutPage: FC = () => {
  return (
    <Column
      style={{
        justifyContent: 'space-between',
        w: 1920,
        h: 1080,
      }}
    >
      <Row
        focusable
        style={{
          justifyContent: 'space-between',
        }}
      >
        <RandomImage />
        <RandomImage />
      </Row>
      <Row
        focusable
        style={{
          justifyContent: 'center',
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

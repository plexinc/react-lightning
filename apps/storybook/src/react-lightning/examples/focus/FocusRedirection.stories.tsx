import {
  type LightningElement,
  type LightningElementStyle,
  useCombinedRef,
  useFocus,
} from '@plextv/react-lightning';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { forwardRef, type ReactNode, useState } from 'react';
import { FocusableImage } from '../../../components/FocusableImage';

export default {
  title: 'react-lightning/Examples/Focus/FocusRedirection',
} as Meta;

const Redirector = forwardRef<
  LightningElement,
  {
    children: ReactNode;
    destinations?: (LightningElement | null)[];
    style?: LightningElementStyle;
  }
>(({ children, destinations, style }, ref) => {
  const { ref: focusRef } = useFocus({
    focusRedirect: true,
    destinations,
  });
  const combinedRef = useCombinedRef(ref, focusRef);

  return (
    <lng-view
      ref={combinedRef}
      style={{
        ...style,
        borderColor: 0xffffff55,
        border: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {children}
    </lng-view>
  );
});

export const FocusRedirect: StoryFn = () => {
  const [element1_2, setElement1_2] = useState<LightningElement | null>(null);
  const [element2_3, setElement2_3] = useState<LightningElement | null>(null);
  const [element3_1, setElement3_1] = useState<LightningElement | null>(null);
  const [element3_3, setElement3_3] = useState<LightningElement | null>(null);

  return (
    <>
      <FocusableImage style={{ w: 95, h: 95, x: 10, y: 10 }} />
      <FocusableImage
        ref={setElement1_2}
        style={{ w: 95, h: 95, x: 180, y: 10 }}
      />
      <Redirector
        destinations={[element1_2]}
        style={{ w: 95, h: 95, x: 350, y: 10 }}
      >
        <lng-text text={'←'} style={{ fontSize: 24 }} />
      </Redirector>

      <Redirector
        destinations={[element3_1]}
        style={{ w: 95, h: 95, x: 10, y: 180 }}
      >
        <lng-text text={'↓'} style={{ fontSize: 24 }} />
      </Redirector>
      <FocusableImage style={{ w: 95, h: 95, x: 180, y: 180 }} />
      <FocusableImage
        ref={setElement2_3}
        style={{ w: 95, h: 95, x: 350, y: 180 }}
      />

      <FocusableImage
        ref={setElement3_1}
        style={{ w: 95, h: 95, x: 10, y: 350 }}
      />
      <Redirector
        destinations={[element3_3]}
        style={{ w: 95, h: 95, x: 180, y: 350 }}
      >
        <lng-text text={'→'} style={{ fontSize: 24 }} />
      </Redirector>
      <Redirector
        ref={setElement3_3}
        destinations={[element2_3]}
        style={{ w: 95, h: 95, x: 350, y: 350 }}
      >
        <lng-text text={'↑'} style={{ fontSize: 24 }} />
      </Redirector>
    </>
  );
};

FocusRedirect.args = {
  label: 'Focus Redirection Example',
  description:
    'This example demonstrates how to redirect focus between elements.',
};

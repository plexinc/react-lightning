import { Column, Row } from '@plextv/react-lightning-components';
import type { Meta } from '@storybook/react';
import { useCallback, useMemo, useState } from 'react';
import Button from '../../../components/Button';
import { FocusableImage } from '../../../components/FocusableImage';

export default {
  title: '@plextv∕react-lightning/Examples/Focus/Focus Group',
  argTypes: {},
} as Meta;

export const SimpleFocusGroup = () => {
  return (
    <Row focusable style={{ gap: 16, padding: 16 }}>
      <FocusableImage />
      <FocusableImage />
      <FocusableImage />
      <FocusableImage />
    </Row>
  );
};

export const FocusDisabling = () => {
  return (
    <Row focusable style={{ gap: 16, padding: 16 }}>
      <FocusableImage />
      <FocusableImage disable />
      <FocusableImage />
      <FocusableImage disable />
      <FocusableImage disable />
      <FocusableImage />
    </Row>
  );
};

const ACTIVE = 0;
const HIDE = 1;
const DISABLE = 2;

export const DynamicFocusDisabling = () => {
  const [childStates, setChildStates] = useState<number[][]>([
    [ACTIVE, ACTIVE, ACTIVE, ACTIVE, ACTIVE],
    [ACTIVE, ACTIVE, ACTIVE],
  ]);

  const children = useMemo(
    () =>
      childStates.map((row, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
        <Row key={index} focusable style={{ gap: 16 }}>
          {row.map((state, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <lng-view key={index}>
              <FocusableImage
                disable={state === DISABLE}
                hidden={state === HIDE}
              />
            </lng-view>
          ))}
        </Row>
      )),
    [childStates],
  );

  const handleButtonPress = useCallback(() => {
    setChildStates((prevChildren) =>
      prevChildren.map((row) => row.map(() => Math.floor(Math.random() * 3))),
    );
  }, []);

  return (
    <Column focusable style={{ gap: 16, padding: 16 }}>
      {children}

      <Button onPress={handleButtonPress}>Randomize</Button>
    </Column>
  );
};

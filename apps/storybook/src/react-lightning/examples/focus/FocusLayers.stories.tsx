import {
  FocusGroup,
  type KeyEvent,
  type LightningElement,
  useFocusManager,
} from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import type { Meta } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import Button from '../../../components/Button';

export default {
  title: 'react-lightning/Examples/Focus/Focus Layers',
  argTypes: {},
} as Meta;

const Modal = ({ dismissModal }: { dismissModal: () => void }) => {
  const focusManager = useFocusManager();
  const ref = useRef<LightningElement>(null);
  const handleKeyPress = (event: KeyEvent) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      dismissModal();
      return false;
    }

    return true;
  };

  useEffect(() => {
    focusManager.pushLayer();

    return () => {
      focusManager.popLayer();
    };
  }, [focusManager]);

  return (
    <Column
      ref={ref}
      focusable
      style={{
        color: 0xffffff05,
        border: { color: 0xff0000ff, width: 2 },
        w: 600,
        h: 200,
        x: 50,
        y: 200,
      }}
    >
      <lng-text>This is a Modal</lng-text>
      <Row focusable>
        <Button>---</Button>
        <Button>---</Button>
        <Button>---</Button>
      </Row>
      <Button onKeyPress={handleKeyPress}>Close Modal</Button>
    </Column>
  );
};

export const ModalExample = () => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleKeyPress = (event: KeyEvent) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      setModalVisible(true);
      return false;
    }

    return true;
  };

  return (
    <FocusGroup style={{ w: 400, h: 400 }}>
      <lng-text>Focus Layers Example</lng-text>
      <Column>
        <Row focusable>
          <Button>---</Button>
          <Button onKeyPress={handleKeyPress}>Open Modal</Button>
          <Button>---</Button>
        </Row>
        {modalVisible ? (
          <Modal dismissModal={() => setModalVisible(false)} />
        ) : null}
      </Column>
    </FocusGroup>
  );
};

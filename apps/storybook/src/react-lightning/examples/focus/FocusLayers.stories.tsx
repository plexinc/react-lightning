import {
  FocusGroup,
  type KeyEvent,
  type LightningElement,
  useFocusManager,
} from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import type { Meta } from '@storybook/react';
import { useEffect, useRef, useState } from 'react';
import Button from '../../../components/Button';

export default {
  title: '@plextv∕react-lightning/Examples/Focus/Focus Layers',
  argTypes: {},
} as Meta;

const Modal = ({
  visible,
  dismissModal,
}: {
  visible: boolean;
  dismissModal: () => void;
}) => {
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
    if (visible && ref.current) {
      focusManager.pushLayer(ref.current);
    }

    return () => {
      focusManager.popLayer();
    };
  }, [visible, focusManager]);

  return (
    <Column
      ref={ref}
      focusable
      style={{
        // Alpha of 0 will hide the modal, but also prevent capturing focus
        alpha: visible ? 1 : 0,
        color: 0xffffff05,
        border: { color: 0xff0000ff, width: 2 },
        width: 600,
        height: 200,
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
    <FocusGroup style={{ width: 400, height: 400 }}>
      <lng-text>Focus Layers Example</lng-text>
      <Column>
        <Row focusable>
          <Button>---</Button>
          <Button onKeyPress={handleKeyPress}>Open Modal</Button>
          <Button>---</Button>
        </Row>
        <Modal
          visible={modalVisible}
          dismissModal={() => setModalVisible(false)}
        />
      </Column>
    </FocusGroup>
  );
};

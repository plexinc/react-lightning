import { Column, Row } from '@plex/react-lightning-components';
import type { Meta } from '@storybook/react';
import { FocusableImage } from '../../../components/FocusableImage';

export default {
  title: '@plex∕react-lightning/Examples/Focus/AutoFocus',
} as Meta;

export const AutoFocus = () => {
  return (
    <>
      <FocusableImage style={{ x: 50, y: 50 }} />
      <FocusableImage style={{ x: 200, y: 50 }} />
      <FocusableImage style={{ x: 50, y: 250 }} />
      <FocusableImage style={{ x: 200, y: 250 }} autoFocus />
    </>
  );
};

export const AutoFocusWithFocusGroups = () => {
  return (
    <Column style={{ gap: 16, padding: 16 }}>
      <Row focusable style={{ gap: 16 }}>
        <FocusableImage />
        <FocusableImage />
        <FocusableImage />
      </Row>
      <Row focusable autoFocus style={{ gap: 16 }}>
        <FocusableImage />
        <FocusableImage />
        <FocusableImage />
      </Row>
      <Row focusable style={{ gap: 16 }}>
        <FocusableImage />
        <FocusableImage />
        <FocusableImage />
      </Row>
    </Column>
  );
};

export const MultipleAutoFocusElements = () => {
  return (
    <Column style={{ gap: 16, padding: 16 }}>
      <Row focusable style={{ gap: 16 }}>
        <FocusableImage />
        <FocusableImage />
        <FocusableImage />
      </Row>
      <Row focusable autoFocus style={{ gap: 16 }}>
        <FocusableImage />
        <FocusableImage />
        <FocusableImage />
      </Row>
      <Row focusable style={{ gap: 16 }}>
        <FocusableImage />
        <FocusableImage autoFocus />
        <FocusableImage />
      </Row>
    </Column>
  );
};

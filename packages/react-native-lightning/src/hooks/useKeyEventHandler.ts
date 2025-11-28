import type {
  KeyEvent,
  LightningElement,
  LightningViewElementProps,
} from '@plextv/react-lightning';
import { type BaseSyntheticEvent, type ModifierKey, useCallback } from 'react';
import { createSyntheticEvent } from '../utils/createSyntheticEvent';

// Based on the KeyboardEvent interface from react, but extended properly for Lightning
type KeyboardEvent = BaseSyntheticEvent<
  KeyEvent,
  LightningElement,
  LightningElement
> & {
  altKey: boolean;
  ctrlKey: boolean;
  code: string;
  /**
   * See [DOM Level 3 Events spec](https://www.w3.org/TR/uievents-key/#keys-modifier). for a list of valid (case-sensitive) arguments to this method.
   */
  getModifierState(key: ModifierKey): boolean;
  /**
   * See the [DOM Level 3 Events spec](https://www.w3.org/TR/uievents-key/#named-key-attribute-values). for possible values
   */
  key: string;
  locale: string;
  location: number;
  metaKey: boolean;
  repeat: boolean;
  shiftKey: boolean;
};

export function useKeyEventHandler(
  eventType: 'onKeyDown' | 'onKeyUp',
  onKeyEvent?: (e: KeyboardEvent) => void,
): LightningViewElementProps[typeof eventType] | undefined {
  const handler = useCallback(
    (event: KeyEvent) => {
      // Some ugly casting to force the typings to work
      (onKeyEvent as unknown as (e: KeyboardEvent) => void)?.(
        createSyntheticEvent<KeyboardEvent>(event.target, {
          altKey: false,
          ctrlKey: false,
          code: event.code,
          key: event.key,
          // TODO
          locale: 'en',
          location: 0,
          metaKey: false,
          repeat: event.repeat,
          shiftKey: false,
          nativeEvent: event,
          type: eventType,
          getModifierState: () => false,
        }),
      );

      return undefined;
    },
    [eventType, onKeyEvent],
  );

  return onKeyEvent ? handler : undefined;
}

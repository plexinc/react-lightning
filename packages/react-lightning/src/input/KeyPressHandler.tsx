import type { FC, ReactNode } from 'react';
import { useContext, useEffect } from 'react';

import { useFocusManager } from '../focus/useFocusManager';
import { bubbleEvent } from './bubbleEvent';
import { createKeyPressTracker } from './createKeyPressTracker';
import { hasModifierKey } from './hasModifierKey';
import { KeyMapContext } from './KeyMapContext';
import { Keys } from './Keys';
import { normalizeKeyEvent } from './normalizeKeyEvent';

export const KeyPressHandler: FC<{ children: ReactNode }> = ({ children }) => {
  const keyMap = useContext(KeyMapContext);
  const focusManager = useFocusManager();

  useEffect(() => {
    const keyPressTracker = createKeyPressTracker();

    const createKeyHandler = (handler: 'onKeyDown' | 'onKeyUp') => {
      return (event: KeyboardEvent) => {
        const element = focusManager.focusPath.at(-1);

        if (!element || !(event instanceof KeyboardEvent)) {
          return;
        }

        // Modifier combos (Cmd+Opt+I, etc.) are host shortcuts, not remote input.
        // Let them through so devtools and browser/Storybook shortcuts still work.
        if (hasModifierKey(event)) {
          return;
        }

        // Build the normalized event once and reuse for all bubbleEvent calls.
        const keyEvent = normalizeKeyEvent(event, keyMap, element);
        const { remoteKey } = keyEvent;

        if (handler === 'onKeyDown') {
          keyPressTracker.keyDown(keyEvent, event.timeStamp);
        } else if (handler === 'onKeyUp') {
          keyPressTracker.keyUp(keyEvent, event.timeStamp);

          // Reset stopFocusHandling for the next bubbleEvent call
          keyEvent.stopFocusHandling = false;
        }

        bubbleEvent(handler, keyEvent);

        if (remoteKey !== Keys.Unknown) {
          event.stopPropagation();
          event.preventDefault();
        }
      };
    };

    const keyDownHandler = createKeyHandler('onKeyDown');
    const keyUpHandler = createKeyHandler('onKeyUp');

    document.body.tabIndex = 1;
    document.body.addEventListener('keydown', keyDownHandler);
    document.body.addEventListener('keyup', keyUpHandler);
    document.body.focus();

    return () => {
      keyPressTracker.cancel();
      document.body.removeEventListener('keydown', keyDownHandler);
      document.body.removeEventListener('keyup', keyUpHandler);
    };
  }, [keyMap, focusManager]);

  return children;
};

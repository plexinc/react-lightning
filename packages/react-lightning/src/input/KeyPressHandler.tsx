import type { FC, ReactNode } from 'react';
import { useContext, useEffect, useRef } from 'react';

import { useFocusManager } from '../focus/useFocusManager';
import { bubbleEvent } from './bubbleEvent';
import { hasModifierKey } from './hasModifierKey';
import type { KeyMap } from './KeyMapContext';
import { KeyMapContext } from './KeyMapContext';
import { Keys } from './Keys';
import { normalizeKeyEvent } from './normalizeKeyEvent';

const LONG_PRESS_THRESHOLD = 500;

export const KeyPressHandler: FC<{ children: ReactNode }> = ({ children }) => {
  const keyMap = useContext(KeyMapContext);
  const focusManager = useFocusManager();
  const keyDownTime = useRef<number>(0);

  const createKeyHandler = (handler: 'onKeyDown' | 'onKeyUp', keyMap: KeyMap) => {
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
        // Stamp the press time only on the initial press — not on the OS
        // auto-repeats that follow while a key is held. Otherwise the
        // long-press duration measured at key-up would reset to ~0 on every
        // repeat and a held key would never register as a long press. The
        // repeats still bubble below, so held directional keys keep navigating
        // and handlers can read `repeat` to drive held-key behavior.
        if (!event.repeat) {
          keyDownTime.current = event.timeStamp;
        }
      } else if (handler === 'onKeyUp') {
        const duration = event.timeStamp - keyDownTime.current;

        keyDownTime.current = 0;

        bubbleEvent(duration > LONG_PRESS_THRESHOLD ? 'onLongPress' : 'onKeyPress', keyEvent);

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

  useEffect(() => {
    const keyDownHandler = createKeyHandler('onKeyDown', keyMap);
    const keyUpHandler = createKeyHandler('onKeyUp', keyMap);

    document.body.tabIndex = 1;
    document.body.addEventListener('keydown', keyDownHandler);
    document.body.addEventListener('keyup', keyUpHandler);
    document.body.focus();

    return () => {
      document.body.removeEventListener('keydown', keyDownHandler);
      document.body.removeEventListener('keyup', keyUpHandler);
    };
  }, [keyMap, createKeyHandler]);

  return children;
};

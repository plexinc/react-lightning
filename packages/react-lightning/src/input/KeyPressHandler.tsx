import type { FC, ReactNode } from 'react';
import { useContext, useEffect, useRef } from 'react';

import { useFocusManager } from '../focus/useFocusManager';
import { bubbleEvent } from './bubbleEvent';
import type { KeyMap } from './KeyMapContext';
import { KeyMapContext } from './KeyMapContext';
import { Keys } from './Keys';

const LONG_PRESS_THRESHOLD = 500;

export const KeyPressHandler: FC<{ children: ReactNode }> = ({ children }) => {
  const keyMap = useContext(KeyMapContext);
  const focusManager = useFocusManager();
  const keyDownTime = useRef<number>(0);

  const createKeyHandler = (handler: 'onKeyDown' | 'onKeyUp', keyMap: KeyMap) => {
    return (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      const element = focusManager.focusPath.at(-1);

      if (!element) {
        return;
      }

      if (event instanceof KeyboardEvent) {
        const remoteKey = keyMap[event.keyCode] ?? Keys.Unknown;

        // Build the event object once and reuse for all bubbleEvent calls
        const keyEvent = {
          keyCode: event.keyCode,
          key: event.key,
          code: event.code,
          remoteKey,
          repeat: event.repeat,
          target: element,
          currentTarget: element,
          stopFocusHandling: false,
          preventDefault: event.preventDefault,
        };

        if (handler === 'onKeyDown') {
          keyDownTime.current = event.timeStamp;
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

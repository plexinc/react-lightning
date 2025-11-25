import type { FC, ReactNode } from 'react';
import { useCallback, useContext, useEffect, useRef } from 'react';
import { KeyEventContext } from './KeyEventProvider';
import type { KeyMap } from './KeyMapContext';
import { KeyMapContext } from './KeyMapContext';
import { Keys } from './Keys';

const LONG_PRESS_THRESHOLD = 500;

export const KeyPressHandler: FC<{ children: ReactNode }> = ({ children }) => {
  const keyMap = useContext(KeyMapContext);
  const keyEvents = useContext(KeyEventContext);
  const keyDownTime = useRef<number>(0);

  const createKeyHandler = useCallback(
    (handler: 'onKeyDown' | 'onKeyUp', keyMap: KeyMap) => {
      return (event: KeyboardEvent) => {
        if (event.repeat) {
          return;
        }

        if (event instanceof KeyboardEvent) {
          const remoteKey = keyMap[event.keyCode] ?? Keys.Unknown;

          if (handler === 'onKeyDown') {
            keyDownTime.current = event.timeStamp;
          } else if (handler === 'onKeyUp') {
            const duration = event.timeStamp - keyDownTime.current;

            keyDownTime.current = 0;

            keyEvents.bubbleEvent(
              duration > LONG_PRESS_THRESHOLD ? 'onLongPress' : 'onKeyPress',
              {
                keyCode: event.keyCode,
                key: event.key,
                code: event.code,
                remoteKey,
              },
            );
          }

          keyEvents.bubbleEvent(handler, {
            keyCode: event.keyCode,
            key: event.key,
            code: event.code,
            remoteKey,
          });

          if (remoteKey !== Keys.Unknown) {
            event.stopPropagation();
            event.preventDefault();
          }
        }
      };
    },
    [keyEvents],
  );

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

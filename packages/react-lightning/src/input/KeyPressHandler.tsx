import type { ReactNode } from 'react';
import { useCallback, useContext, useEffect, useRef } from 'react';
import { LightningRootContext } from '../render';
import { KeyEventContext } from './KeyEventProvider';
import type { KeyMap } from './KeyMapContext';
import { KeyMapContext } from './KeyMapContext';
import { Keys } from './Keys';

const LONG_PRESS_THRESHOLD = 500;

export const KeyPressHandler = ({ children }: { children: ReactNode }) => {
  const lngContext = useContext(LightningRootContext);
  const keyMap = useContext(KeyMapContext);
  const keyEvents = useContext(KeyEventContext);
  const keyDownTime = useRef<number>(0);
  const domElement = lngContext?.renderer.canvas;

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

    if (domElement) {
      if (!(domElement instanceof HTMLCanvasElement)) {
        throw new Error(
          'InputHandler: Provider must be attached at the root of the application. ',
        );
      }

      domElement.tabIndex = 1;
      domElement.addEventListener('keydown', keyDownHandler);
      domElement.addEventListener('keyup', keyUpHandler);
      domElement.focus();
    }

    return () => {
      if (domElement) {
        domElement.removeEventListener('keydown', keyDownHandler);
        domElement.removeEventListener('keyup', keyUpHandler);
      }
    };
  }, [keyMap, createKeyHandler, domElement]);

  return children;
};

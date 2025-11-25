import type { Context, FC, ReactNode } from 'react';
import { createContext, useCallback } from 'react';
import { useFocusManager } from '../focus/useFocusManager';
import type { KeyEvent, LightningElement } from '../types';

type BubbleEventFn = (
  handler: 'onKeyUp' | 'onKeyDown' | 'onKeyPress' | 'onLongPress',
  event: Omit<KeyEvent, 'target'>,
) => void;

export const KeyEventContext: Context<{ bubbleEvent: BubbleEventFn }> =
  createContext<{ bubbleEvent: BubbleEventFn }>({
    bubbleEvent: () => {},
  });

export const KeyEventProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const focusManager = useFocusManager();

  const bubbleEvent = useCallback<BubbleEventFn>(
    (handler, event) => {
      let element: LightningElement | undefined | null =
        focusManager.focusPath.at(-1);

      while (element) {
        const result = element?.props?.[handler]?.({
          ...event,
          target: element,
        });

        if (result === false) {
          return;
        }

        element = element.parent;
      }
    },
    [focusManager],
  );

  return (
    <KeyEventContext.Provider value={{ bubbleEvent }}>
      {children}
    </KeyEventContext.Provider>
  );
};

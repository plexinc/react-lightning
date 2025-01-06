import type { ReactNode } from 'react';
import { createContext, useCallback, useContext } from 'react';
import { FocusPathContext } from '../focus/FocusPathProvider';
import type { KeyEvent, LightningElement } from '../types';

type BubbleEventFn = (
  handler: 'onKeyUp' | 'onKeyDown' | 'onKeyPress' | 'onLongPress',
  event: Omit<KeyEvent, 'target'>,
) => void;

export const KeyEventContext = createContext<{ bubbleEvent: BubbleEventFn }>({
  bubbleEvent: () => {},
});

export const KeyEventProvider = ({ children }: { children: ReactNode }) => {
  const { getFocusPath } = useContext(FocusPathContext);

  const bubbleEvent = useCallback<BubbleEventFn>(
    (handler, event) => {
      let element: LightningElement | undefined | null = getFocusPath().at(-1);

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
    [getFocusPath],
  );

  return (
    <KeyEventContext.Provider value={{ bubbleEvent }}>
      {children}
    </KeyEventContext.Provider>
  );
};

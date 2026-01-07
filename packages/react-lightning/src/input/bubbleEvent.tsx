import type { KeyEvent, LightningElement } from '../types';

type BubbleEventFn = (
  handler: 'onKeyUp' | 'onKeyDown' | 'onKeyPress' | 'onLongPress',
  event: KeyEvent & { currentTarget: LightningElement },
) => void;
export const bubbleEvent: BubbleEventFn = (handler, event) => {
  let element: LightningElement | undefined | null = event.target;

  while (element) {
    event.currentTarget = element;

    const result = element?.props?.[handler]?.(event);

    if (result === false) {
      return;
    }

    element = element.parent;
  }
};

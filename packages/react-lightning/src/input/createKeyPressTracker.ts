import type { KeyEvent } from '../types';
import { bubbleEvent } from './bubbleEvent';

export const LONG_PRESS_THRESHOLD = 500;

export type KeyPressTracker = {
  keyDown(event: KeyEvent, timeStamp: number): void;
  keyUp(event: KeyEvent, timeStamp: number): void;
  cancel(): void;
};

export function createKeyPressTracker(): KeyPressTracker {
  let keyDownTime = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let longPressFired = false;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  return {
    keyDown(event, timeStamp) {
      // OS auto-repeats while a key is held must not restart the timing, or a
      // held key would never reach the threshold.
      if (event.repeat) {
        return;
      }

      keyDownTime = timeStamp;
      longPressFired = false;
      cancel();

      timer = setTimeout(() => {
        timer = undefined;
        longPressFired = true;
        event.stopFocusHandling = false;
        bubbleEvent('onLongPress', event);
      }, LONG_PRESS_THRESHOLD);
    },

    keyUp(event, timeStamp) {
      cancel();

      const duration = timeStamp - keyDownTime;

      keyDownTime = 0;

      // Fallback for when the timer couldn't fire before keyup (a busy main
      // thread), so a long hold still never turns into a regular press.
      if (!longPressFired) {
        bubbleEvent(duration > LONG_PRESS_THRESHOLD ? 'onLongPress' : 'onKeyPress', event);
      }

      longPressFired = false;
    },

    cancel,
  };
}

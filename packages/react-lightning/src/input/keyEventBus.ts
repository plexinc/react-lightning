import type { KeyEvent } from '../types/KeyEvent';

export type KeyEventPhase = 'down' | 'up' | 'longPress';

export type KeyEventListener = (
  event: KeyEvent,
  phase: KeyEventPhase,
) => boolean | null | undefined | void;

export type KeyEventBus = {
  addListener(listener: KeyEventListener): () => void;
  dispatch(event: KeyEvent, phase: KeyEventPhase): boolean;
};

export function createKeyEventBus(): KeyEventBus {
  const listeners: KeyEventListener[] = [];

  return {
    addListener(listener) {
      listeners.push(listener);

      return () => {
        const index = listeners.lastIndexOf(listener);

        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },

    dispatch(event, phase) {
      if (listeners.length === 0) {
        return false;
      }

      // A listener can add or remove listeners while it runs (a back press that
      // pops a screen), so walk a snapshot.
      const current = listeners.slice();

      for (let i = current.length - 1; i >= 0; i--) {
        try {
          if (current[i]?.(event, phase)) {
            return true;
          }
        } catch (error) {
          console.error(error);
        }
      }

      return false;
    },
  };
}

export const keyEventBus: KeyEventBus = createKeyEventBus();

type KeyEventHandler = (event: KeyEvent) => false | undefined;

const handle =
  (phase: KeyEventPhase): KeyEventHandler =>
  (event) =>
    keyEventBus.dispatch(event, phase) ? false : undefined;

export const keyEventBusHandlers: Record<'onKeyDown' | 'onKeyUp' | 'onLongPress', KeyEventHandler> =
  {
    onKeyDown: handle('down'),
    onKeyUp: handle('up'),
    onLongPress: handle('longPress'),
  };

import type { ScrollEvent } from './VirtualListTypes';

export interface MomentumCallbacks {
  onMomentumScrollBegin?: (event: ScrollEvent) => void;
  onMomentumScrollEnd?: (event: ScrollEvent) => void;
}

export interface MomentumTracker {
  /** Fire onMomentumScrollBegin once when an animated scroll starts. */
  start: (event: ScrollEvent) => void;
  /** Fire onMomentumScrollEnd once when the animation settles. */
  settle: (event: ScrollEvent) => void;
  /** Fire onMomentumScrollEnd once when an in-flight animation is cancelled. */
  cancel: (event: ScrollEvent) => void;
}

// Guards the momentum begin/end pair so consumers see a balanced lifecycle:
// begin fires once per animated scroll, end fires exactly once (on settle OR
// cancel), and an end never escapes without a matching begin. A missed or
// unbalanced end is how fast-scroll mode sticks on after the scroll has stopped.
export function createMomentumTracker(callbacks: { current: MomentumCallbacks }): MomentumTracker {
  let animating = false;

  const finish = (event: ScrollEvent): void => {
    if (!animating) {
      return;
    }

    animating = false;
    callbacks.current.onMomentumScrollEnd?.(event);
  };

  return {
    start(event) {
      if (animating) {
        return;
      }

      animating = true;
      callbacks.current.onMomentumScrollBegin?.(event);
    },
    settle: finish,
    cancel: finish,
  };
}

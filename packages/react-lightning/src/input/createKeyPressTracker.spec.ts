import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { KeyEvent, LightningElement } from '../types';
import { createKeyPressTracker, LONG_PRESS_THRESHOLD } from './createKeyPressTracker';
import { Keys } from './Keys';

function setup() {
  const onKeyPress = vi.fn();
  const onLongPress = vi.fn();
  const target = {
    props: { onKeyPress, onLongPress },
    parent: null,
  } as unknown as LightningElement;
  const tracker = createKeyPressTracker();

  const keyEvent = (repeat = false): KeyEvent => ({
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    remoteKey: Keys.Enter,
    repeat,
    target,
    currentTarget: target,
    stopFocusHandling: false,
    preventDefault: vi.fn(),
  });

  return { tracker, keyEvent, onKeyPress, onLongPress };
}

describe('createKeyPressTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onLongPress while the key is still held and nothing on keyup', () => {
    const { tracker, keyEvent, onKeyPress, onLongPress } = setup();

    tracker.keyDown(keyEvent(), 0);
    vi.advanceTimersByTime(LONG_PRESS_THRESHOLD - 1);

    expect(onLongPress).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(onLongPress).toHaveBeenCalledTimes(1);

    tracker.keyUp(keyEvent(), 800);

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onKeyPress).not.toHaveBeenCalled();
  });

  it('fires onKeyPress once on a short tap', () => {
    const { tracker, keyEvent, onKeyPress, onLongPress } = setup();

    tracker.keyDown(keyEvent(), 0);
    vi.advanceTimersByTime(100);
    tracker.keyUp(keyEvent(), 100);
    vi.runAllTimers();

    expect(onKeyPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('does not restart the timer on auto-repeat keydowns', () => {
    const { tracker, keyEvent, onLongPress } = setup();

    tracker.keyDown(keyEvent(), 0);

    for (let t = 100; t < LONG_PRESS_THRESHOLD; t += 100) {
      vi.advanceTimersByTime(100);
      tracker.keyDown(keyEvent(true), t);
    }

    vi.advanceTimersByTime(100);

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('falls back to the keyup duration when the timer has not fired yet', () => {
    const { tracker, keyEvent, onKeyPress, onLongPress } = setup();

    tracker.keyDown(keyEvent(), 0);
    tracker.keyUp(keyEvent(), LONG_PRESS_THRESHOLD + 1);
    vi.runAllTimers();

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onKeyPress).not.toHaveBeenCalled();
  });

  it('cancels a pending long press', () => {
    const { tracker, keyEvent, onLongPress } = setup();

    tracker.keyDown(keyEvent(), 0);
    tracker.cancel();
    vi.runAllTimers();

    expect(onLongPress).not.toHaveBeenCalled();
  });
});

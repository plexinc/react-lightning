import { describe, expect, it, vi } from 'vitest';

import { createKeyEventBus, type KeyEvent, Keys } from '@plextv/react-lightning';

import { createBackHandler } from './backHandler';

const keyEvent = (remoteKey: Keys | Keys[]) => ({ remoteKey }) as KeyEvent;

describe('createBackHandler', () => {
  it('runs the newest handler first and stops at the first that returns true', () => {
    const bus = createKeyEventBus();
    const backHandler = createBackHandler(bus);
    const calls: string[] = [];

    backHandler.addEventListener('hardwareBackPress', () => {
      calls.push('first');
      return true;
    });
    backHandler.addEventListener('hardwareBackPress', () => {
      calls.push('second');
      return true;
    });
    backHandler.addEventListener('hardwareBackPress', () => {
      calls.push('third');
      return null;
    });

    expect(bus.dispatch(keyEvent(Keys.Back), 'up')).toBe(true);
    expect(calls).toEqual(['third', 'second']);
  });

  it('fires on key up only', () => {
    const bus = createKeyEventBus();
    const handler = vi.fn(() => true);

    createBackHandler(bus).addEventListener('hardwareBackPress', handler);

    expect(bus.dispatch(keyEvent(Keys.Back), 'down')).toBe(false);
    expect(handler).not.toHaveBeenCalled();

    bus.dispatch(keyEvent(Keys.Back), 'up');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches Back inside a multi-key binding and ignores other keys', () => {
    const bus = createKeyEventBus();
    const handler = vi.fn(() => true);

    createBackHandler(bus).addEventListener('hardwareBackPress', handler);
    bus.dispatch(keyEvent(Keys.Enter), 'up');

    expect(handler).not.toHaveBeenCalled();

    bus.dispatch(keyEvent([Keys.Exit, Keys.Back]), 'up');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('stops calling a removed handler', () => {
    const bus = createKeyEventBus();
    const handler = vi.fn(() => true);
    const subscription = createBackHandler(bus).addEventListener('hardwareBackPress', handler);

    subscription.remove();

    expect(bus.dispatch(keyEvent(Keys.Back), 'up')).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('exposes exitApp', () => {
    const exitApp = vi.fn();

    createBackHandler(createKeyEventBus(), exitApp).exitApp();

    expect(exitApp).toHaveBeenCalledTimes(1);
  });
});

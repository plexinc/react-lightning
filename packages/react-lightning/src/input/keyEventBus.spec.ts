import { describe, expect, it, vi } from 'vitest';

import type { KeyEvent } from '../types';
import { createKeyEventBus } from './keyEventBus';
import { Keys } from './Keys';

const event = { remoteKey: Keys.Back } as KeyEvent;

describe('createKeyEventBus', () => {
  it('calls the newest listener first and stops at the first that handles it', () => {
    const bus = createKeyEventBus();
    const calls: string[] = [];

    bus.addListener(() => {
      calls.push('first');
      return true;
    });
    bus.addListener(() => {
      calls.push('second');
      return true;
    });
    bus.addListener(() => {
      calls.push('third');
      return false;
    });

    expect(bus.dispatch(event, 'up')).toBe(true);
    expect(calls).toEqual(['third', 'second']);
  });

  it('reports unhandled when no listener returns true', () => {
    const bus = createKeyEventBus();

    bus.addListener(() => undefined);

    expect(bus.dispatch(event, 'down')).toBe(false);
  });

  it('passes the phase through', () => {
    const bus = createKeyEventBus();
    const listener = vi.fn();

    bus.addListener(listener);
    bus.dispatch(event, 'longPress');

    expect(listener).toHaveBeenCalledWith(event, 'longPress');
  });

  it('stops calling a removed listener', () => {
    const bus = createKeyEventBus();
    const listener = vi.fn();
    const remove = bus.addListener(listener);

    remove();
    remove();
    bus.dispatch(event, 'up');

    expect(listener).not.toHaveBeenCalled();
  });

  it('finishes the dispatch when a listener removes another mid-dispatch', () => {
    const bus = createKeyEventBus();
    const older = vi.fn();
    const removeOlder = bus.addListener(older);

    bus.addListener(() => {
      removeOlder();
      return false;
    });

    bus.dispatch(event, 'up');

    expect(older).toHaveBeenCalledTimes(1);

    bus.dispatch(event, 'up');

    expect(older).toHaveBeenCalledTimes(1);
  });

  it('keeps going when a listener throws', () => {
    const bus = createKeyEventBus();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.addListener(() => true);
    bus.addListener(() => {
      throw new Error('boom');
    });

    expect(bus.dispatch(event, 'up')).toBe(true);
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});

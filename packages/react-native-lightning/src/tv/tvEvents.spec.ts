import { describe, expect, it, vi } from 'vitest';

import { createKeyEventBus, type KeyEvent, Keys } from '@plextv/react-lightning';

import { addTVEventListener, toTVEventType } from './tvEvents';

const keyEvent = (remoteKey: Keys | Keys[], repeat = false) => ({ remoteKey, repeat }) as KeyEvent;

describe('toTVEventType', () => {
  it('maps remote keys to RN-tvOS event types', () => {
    expect(toTVEventType(Keys.Up)).toBe('up');
    expect(toTVEventType(Keys.Down)).toBe('down');
    expect(toTVEventType(Keys.Left)).toBe('left');
    expect(toTVEventType(Keys.Right)).toBe('right');
    expect(toTVEventType(Keys.Enter)).toBe('select');
    expect(toTVEventType(Keys.PlayPause)).toBe('playPause');
    expect(toTVEventType(Keys.FastForward)).toBe('fastForward');
    expect(toTVEventType(Keys.Rewind)).toBe('rewind');
    expect(toTVEventType(Keys.SkipNext)).toBe('next');
    expect(toTVEventType(Keys.Back)).toBe('back');
  });

  it('uses the first mapped key of a multi-key binding', () => {
    expect(toTVEventType([Keys.PreviousTab, Keys.Rewind])).toBe('rewind');
    expect(toTVEventType([Keys.PageUp, Keys.StepForward])).toBeNull();
  });

  it('returns null for unmapped keys', () => {
    expect(toTVEventType(Keys.Num1)).toBeNull();
  });
});

describe('addTVEventListener', () => {
  it('fires once per press, on the down edge', () => {
    const bus = createKeyEventBus();
    const listener = vi.fn();

    addTVEventListener(bus, listener);
    bus.dispatch(keyEvent(Keys.Right), 'down');
    bus.dispatch(keyEvent(Keys.Right), 'up');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ eventType: 'right', eventKeyAction: 0 });
  });

  it('consumes the press when the listener returns true', () => {
    const bus = createKeyEventBus();

    addTVEventListener(bus, () => true);

    expect(bus.dispatch(keyEvent(Keys.Left), 'down')).toBe(true);
    expect(bus.dispatch(keyEvent(Keys.Left), 'up')).toBe(false);
  });

  it('does not consume when the listener returns nothing', () => {
    const bus = createKeyEventBus();

    addTVEventListener(bus, () => undefined);

    expect(bus.dispatch(keyEvent(Keys.Left), 'down')).toBe(false);
  });

  it('ignores unmapped keys', () => {
    const bus = createKeyEventBus();
    const listener = vi.fn();

    addTVEventListener(bus, listener);
    bus.dispatch(keyEvent(Keys.Num5), 'down');

    expect(listener).not.toHaveBeenCalled();
  });

  it('emits longSelect on a long Enter press and on its release', () => {
    const bus = createKeyEventBus();
    const listener = vi.fn();

    addTVEventListener(bus, listener);
    bus.dispatch(keyEvent(Keys.Enter), 'down');
    bus.dispatch(keyEvent(Keys.Enter), 'longPress');
    bus.dispatch(keyEvent(Keys.Enter, true), 'down');
    bus.dispatch(keyEvent(Keys.Enter), 'up');
    bus.dispatch(keyEvent(Keys.Enter), 'up');

    expect(listener.mock.calls.map(([event]) => event)).toEqual([
      { eventType: 'select', eventKeyAction: 0 },
      { eventType: 'longSelect', eventKeyAction: 0 },
      { eventType: 'select', eventKeyAction: 0 },
      { eventType: 'longSelect', eventKeyAction: 1 },
    ]);
  });

  it('ignores long presses of other keys', () => {
    const bus = createKeyEventBus();
    const listener = vi.fn();

    addTVEventListener(bus, listener);
    bus.dispatch(keyEvent(Keys.Right), 'longPress');

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops listening once removed', () => {
    const bus = createKeyEventBus();
    const listener = vi.fn();

    addTVEventListener(bus, listener)();
    bus.dispatch(keyEvent(Keys.Up), 'down');

    expect(listener).not.toHaveBeenCalled();
  });
});

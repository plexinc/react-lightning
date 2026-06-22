import { describe, expect, it, vi } from 'vitest';

import type { LightningElement } from '../types';
import type { KeyMap } from './KeyMapContext';
import { Keys } from './Keys';
import { normalizeKeyEvent, type RawKeyEvent } from './normalizeKeyEvent';

const element = { id: 1 } as unknown as LightningElement;

const keyMap: KeyMap = {
  37: Keys.Left,
  38: Keys.Up,
  39: Keys.Right,
  40: Keys.Down,
  13: Keys.Enter,
};

function rawEvent(overrides: Partial<RawKeyEvent> = {}): RawKeyEvent {
  return {
    key: 'ArrowRight',
    code: 'ArrowRight',
    keyCode: 39,
    repeat: false,
    preventDefault: vi.fn(),
    ...overrides,
  };
}

describe('normalizeKeyEvent', () => {
  it('maps the keyCode to a remoteKey via the key map', () => {
    const result = normalizeKeyEvent(rawEvent({ keyCode: 38 }), keyMap, element);

    expect(result.remoteKey).toBe(Keys.Up);
  });

  it('falls back to Keys.Unknown for an unmapped keyCode', () => {
    const result = normalizeKeyEvent(rawEvent({ keyCode: 999 }), keyMap, element);

    expect(result.remoteKey).toBe(Keys.Unknown);
  });

  it('preserves the held-key repeat flag', () => {
    expect(normalizeKeyEvent(rawEvent({ repeat: true }), keyMap, element).repeat).toBe(true);
    expect(normalizeKeyEvent(rawEvent({ repeat: false }), keyMap, element).repeat).toBe(false);
  });

  it('sets target and currentTarget to the focused element and defaults stopFocusHandling', () => {
    const result = normalizeKeyEvent(rawEvent(), keyMap, element);

    expect(result.target).toBe(element);
    expect(result.currentTarget).toBe(element);
    expect(result.stopFocusHandling).toBe(false);
  });

  it('exposes a bound preventDefault that calls through without an illegal-invocation error', () => {
    const preventDefault = vi.fn();
    const result = normalizeKeyEvent(rawEvent({ preventDefault }), keyMap, element);

    // A copied (unbound) DOM method would throw "Illegal invocation" here.
    expect(() => result.preventDefault()).not.toThrow();
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});

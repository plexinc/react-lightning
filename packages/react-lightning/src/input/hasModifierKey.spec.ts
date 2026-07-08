import { describe, expect, it } from 'vitest';

import { hasModifierKey, type ModifierKeyEvent } from './hasModifierKey';

function event(overrides: Partial<ModifierKeyEvent> = {}): ModifierKeyEvent {
  return { metaKey: false, ctrlKey: false, altKey: false, ...overrides };
}

describe('hasModifierKey', () => {
  it('is false when no modifier is held', () => {
    expect(hasModifierKey(event())).toBe(false);
  });

  it('is true when meta, ctrl, or alt is held', () => {
    expect(hasModifierKey(event({ metaKey: true }))).toBe(true);
    expect(hasModifierKey(event({ ctrlKey: true }))).toBe(true);
    expect(hasModifierKey(event({ altKey: true }))).toBe(true);
  });

  it('ignores shift so plain keycodes still map (shift does not form a host shortcut here)', () => {
    expect(hasModifierKey(event({ shiftKey: true } as Partial<ModifierKeyEvent>))).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Keys } from '../input/Keys';
import { createMockElement, type MockElement } from '../mocks/createMockElement';
import type { KeyEvent, LightningElement } from '../types';
import { FocusKeyManager } from './FocusKeyManager';
import { FocusManager } from './FocusManager';

// The mock elements have no geometry, so every move finds nothing inside the group.
vi.mock('../utils/findClosestElement', () => ({
  findClosestElement: () => null,
  resolveDirectionalTarget: (_from: unknown, target: unknown) => target,
}));

const group = (id: number, name: string) => {
  const element = createMockElement(id, name);
  element.isFocusGroup = true;

  return element;
};

describe('focus keys', () => {
  let focusManager: FocusManager<MockElement>;

  beforeEach(() => {
    focusManager = new FocusManager();
  });

  it('focuses an element by key', () => {
    const play = createMockElement(1, 'play');
    focusManager.addElement(play);
    focusManager.setFocusKey(play, 'play');

    expect(focusManager.getElementByKey('play')).toBe(play);
    expect(focusManager.focusByKey('play')).toBe(true);
    expect(focusManager.focusByKey('missing')).toBe(false);
  });

  it('frees a key when its element is removed', () => {
    const play = createMockElement(1, 'play');
    focusManager.addElement(play);
    focusManager.setFocusKey(play, 'play');
    focusManager.removeElement(play);

    expect(focusManager.getElementByKey('play')).toBeNull();
  });

  it('keeps a key with the last element to claim it', () => {
    const a = createMockElement(1, 'a');
    const b = createMockElement(2, 'b');
    focusManager.addElement(a);
    focusManager.addElement(b);
    focusManager.setFocusKey(a, 'same');
    focusManager.setFocusKey(b, 'same');
    focusManager.removeElement(a);

    expect(focusManager.getElementByKey('same')).toBe(b);
  });

  describe('destinationKeys', () => {
    const build = () => {
      const start = createMockElement(1, 'start');
      const region = group(2, 'region');
      const first = createMockElement(3, 'first');
      const second = createMockElement(4, 'second');
      focusManager.addElement(start);
      focusManager.addElement(region, null, { focusRedirect: true });
      focusManager.addElement(first, region);
      focusManager.addElement(second, region);
      focusManager.setFocusKey(second, 'second');
      focusManager.focus(start);

      return { region, first, second };
    };

    it('forwards arriving focus to the first mounted key', () => {
      const { region, second } = build();
      focusManager.setDestinationKeys(region, ['missing', 'second']);
      focusManager.focus(region);

      expect(second.focused).toBe(true);
    });

    it('resolves the first sentinel to the first focusable child', () => {
      const { region, first } = build();
      focusManager.setDestinationKeys(region, ['first']);
      focusManager.focus(region);

      expect(first.focused).toBe(true);
    });

    it('resolves last-focused to the remembered child, then falls back', () => {
      const { region, first, second } = build();
      focusManager.focus(second);
      focusManager.focus(createMockElementOutside(focusManager));
      focusManager.setDestinationKeys(region, ['last-focused', 'first']);
      focusManager.focus(region);

      expect(second.focused).toBe(true);
      expect(first.focused).toBe(false);
    });

    it('falls back to the normal child when no key is mounted', () => {
      const { region, first } = build();
      focusManager.setDestinationKeys(region, ['nope']);
      focusManager.focus(region);

      expect(first.focused).toBe(true);
    });
  });

  describe('exits', () => {
    it('goes to the exit key when nothing lies inside in that direction', () => {
      const keyManager = new FocusKeyManager(
        focusManager as unknown as FocusManager<LightningElement>,
      );
      const region = group(1, 'region');
      const tile = createMockElement(2, 'tile');
      const target = createMockElement(3, 'target');
      focusManager.addElement(region);
      focusManager.addElement(tile, region);
      focusManager.addElement(target);
      focusManager.setFocusKey(target, 'target');
      focusManager.setExits(region, { down: 'target' });
      focusManager.focus(tile);

      const event = { remoteKey: Keys.Down } as KeyEvent;

      expect(keyManager.handleKeyDown(region as unknown as LightningElement, event)).toBe(false);
      expect(target.focused).toBe(true);
    });

    it('lets the key through when the exit key is not mounted', () => {
      const keyManager = new FocusKeyManager(
        focusManager as unknown as FocusManager<LightningElement>,
      );
      const region = group(1, 'region');
      const tile = createMockElement(2, 'tile');
      focusManager.addElement(region);
      focusManager.addElement(tile, region);
      focusManager.setExits(region, { down: 'gone' });
      focusManager.focus(tile);

      const event = { remoteKey: Keys.Down } as KeyEvent;

      expect(keyManager.handleKeyDown(region as unknown as LightningElement, event)).toBe(true);
      expect(tile.focused).toBe(true);
    });
  });
});

let outsideId = 100;

function createMockElementOutside(focusManager: FocusManager<MockElement>) {
  const element = createMockElement(outsideId++, 'outside');
  focusManager.addElement(element);

  return element;
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Keys } from '../input/Keys';
import { createMockElement, type MockElement } from '../mocks/createMockElement';
import type { KeyEvent, LightningElement } from '../types';
import { FocusKeyManager } from './FocusKeyManager';
import { FocusManager } from './FocusManager';

vi.mock('../utils/findClosestElement', () => ({
  findClosestElement: () => null,
  resolveDirectionalTarget: (_from: unknown, target: unknown) => target,
}));

const group = (id: number, name: string) => {
  const element = createMockElement(id, name);
  element.isFocusGroup = true;

  return element;
};

describe('requestFocusByKey', () => {
  let focusManager: FocusManager<MockElement>;
  let root: MockElement;
  let first: MockElement;

  beforeEach(() => {
    vi.useFakeTimers();
    focusManager = new FocusManager();
    root = group(1, 'root');
    first = createMockElement(2, 'first');
    focusManager.addElement(root);
    focusManager.addElement(first, root);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('focuses a key that is already there right away', async () => {
    const play = createMockElement(3, 'play');
    focusManager.addElement(play, root, { focusKey: 'play' });

    await expect(focusManager.requestFocusByKey('play')).resolves.toBe(true);
    expect(play.focused).toBe(true);
  });

  it('waits for a key that mounts later', async () => {
    const result = focusManager.requestFocusByKey('play');
    const play = createMockElement(3, 'play');
    focusManager.addElement(play, root, { focusKey: 'play' });

    await expect(result).resolves.toBe(true);
    expect(focusManager.focusPath).toEqual([root, play]);
  });

  it('waits for a key set after registration', async () => {
    const play = createMockElement(3, 'play');
    focusManager.addElement(play, root);
    const result = focusManager.requestFocusByKey('play');
    focusManager.setFocusKey(play, 'play');

    await expect(result).resolves.toBe(true);
  });

  it('waits for a keyed group until it has something to focus', async () => {
    const row = group(3, 'row');
    focusManager.addElement(row, root, { focusKey: 'row' });
    const result = focusManager.requestFocusByKey('row');
    const tile = createMockElement(4, 'tile');
    focusManager.addElement(tile, row);

    await expect(result).resolves.toBe(true);
    expect(focusManager.focusPath).toEqual([root, row, tile]);
  });

  it('resolves false when the key never mounts', async () => {
    const result = focusManager.requestFocusByKey('missing', { timeoutMs: 500 });
    vi.advanceTimersByTime(500);

    await expect(result).resolves.toBe(false);

    focusManager.addElement(createMockElement(3, 'late'), root, { focusKey: 'missing' });
    expect(focusManager.focusPath).toEqual([root, first]);
  });

  it('resolves false when aborted', async () => {
    const controller = new AbortController();
    const result = focusManager.requestFocusByKey('play', { signal: controller.signal });
    controller.abort();

    await expect(result).resolves.toBe(false);
    await expect(
      focusManager.requestFocusByKey('play', { signal: controller.signal }),
    ).resolves.toBe(false);
  });

  it('lets a newer request supersede an older one', async () => {
    const older = focusManager.requestFocusByKey('a');
    const newer = focusManager.requestFocusByKey('b');
    const a = createMockElement(3, 'a');
    const b = createMockElement(4, 'b');
    focusManager.addElement(a, root, { focusKey: 'a' });

    await expect(older).resolves.toBe(false);
    expect(a.focused).toBe(false);

    focusManager.addElement(b, root, { focusKey: 'b' });
    await expect(newer).resolves.toBe(true);
  });

  it('gives up when the user moves first', async () => {
    const keyManager = new FocusKeyManager(
      focusManager as unknown as FocusManager<LightningElement>,
    );
    const result = focusManager.requestFocusByKey('play');
    keyManager.handleKeyDown(
      root as unknown as LightningElement,
      { remoteKey: Keys.Down } as KeyEvent,
    );

    await expect(result).resolves.toBe(false);

    focusManager.addElement(createMockElement(3, 'play'), root, { focusKey: 'play' });
    expect(focusManager.focusPath).toEqual([root, first]);
  });
});

describe('containsFocus', () => {
  it('is true for the focused key and its ancestors only', () => {
    const focusManager = new FocusManager<MockElement>();
    const root = group(1, 'root');
    const row = group(2, 'row');
    const tile = createMockElement(3, 'tile');
    const other = createMockElement(4, 'other');
    focusManager.addElement(root, null, { focusKey: 'root' });
    focusManager.addElement(row, root, { focusKey: 'row' });
    focusManager.addElement(tile, row, { focusKey: 'tile' });
    focusManager.addElement(other, root, { focusKey: 'other' });
    focusManager.focus(tile);

    expect(focusManager.containsFocus('row')).toBe(true);
    expect(focusManager.containsFocus('tile')).toBe(true);
    expect(focusManager.containsFocus('other')).toBe(false);
    expect(focusManager.containsFocus('missing')).toBe(false);
  });
});

describe('pending focus across layers', () => {
  let focusManager: FocusManager<MockElement>;
  let root: MockElement;
  let opener: MockElement;

  beforeEach(() => {
    focusManager = new FocusManager();
    root = group(1, 'root');
    opener = createMockElement(2, 'opener');
    focusManager.addElement(root);
    focusManager.addElement(opener, root);
  });

  it('keeps a request for an element that registers in the new layer', () => {
    const sheetItem = createMockElement(3, 'sheet item');
    focusManager.focus(sheetItem);
    focusManager.pushLayer();
    focusManager.addElement(sheetItem);

    expect(sheetItem.focused).toBe(true);
  });

  it('drops a request for an element left behind in the old layer', () => {
    const hidden = createMockElement(3, 'hidden');
    hidden.focusable = false;
    focusManager.addElement(hidden, root);
    focusManager.focus(hidden);
    focusManager.pushLayer();
    focusManager.addElement(createMockElement(4, 'sheet item'));
    hidden.focusable = true;
    focusManager.addElement(hidden);

    expect(hidden.focused).toBe(false);
  });

  it('lands a request for an element underneath once the layer closes', () => {
    const other = createMockElement(3, 'other');
    focusManager.addElement(other, root);
    focusManager.pushLayer();
    focusManager.addElement(createMockElement(4, 'sheet item'));
    focusManager.focus(other);
    focusManager.popLayer();

    expect(other.focused).toBe(true);
    expect(focusManager.focusPath).toEqual([root, other]);
  });
});

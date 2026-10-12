import { beforeEach, describe, expect, it } from 'vitest';

import { Keys } from '../input/Keys';
import { createMockElement, type MockElement } from '../mocks/createMockElement';
import type { KeyEvent, LightningElement, Rect } from '../types';
import { FocusKeyManager } from './FocusKeyManager';
import { FocusManager } from './FocusManager';

type PlacedElement = MockElement & {
  node: { w: number; h: number };
  getRelativePosition: () => { x: number; y: number };
};

let nextId = 1;

function place(name: string, rect: Rect, isGroup = false): PlacedElement {
  const element = createMockElement(nextId++, name) as PlacedElement;
  element.isFocusGroup = isGroup;
  element.node = { w: rect.w, h: rect.h };
  element.getRelativePosition = () => ({ x: rect.x, y: rect.y });

  return element;
}

describe('directional moves', () => {
  let fm: FocusManager<MockElement>;
  let km: FocusKeyManager<LightningElement>;

  const press = (group: MockElement, remoteKey: Keys) =>
    km.handleKeyDown(group as unknown as LightningElement, { remoteKey } as KeyEvent);

  beforeEach(() => {
    nextId = 1;
    fm = new FocusManager();
    km = new FocusKeyManager(fm as unknown as FocusManager<LightningElement>);
  });

  // A full-width activity row whose focused tile sits at the left, under a
  // narrow action bar, with a summary off to the right of the action bar.
  const buildDetails = () => {
    const page = place('page', { x: 0, y: 0, w: 1952, h: 600 }, true);
    const summary = place('summary', { x: 500, y: 0, w: 1400, h: 250 });
    const actions = place('actions', { x: 0, y: 200, w: 448, h: 60 }, true);
    const play = place('play', { x: 0, y: 200, w: 200, h: 60 });
    const activity = place('activity', { x: 0, y: 300, w: 1952, h: 100 }, true);
    const tile = place('tile', { x: 0, y: 300, w: 300, h: 100 });
    fm.addElement(page);
    fm.addElement(summary, page);
    fm.addElement(actions, page);
    fm.addElement(play, actions);
    fm.addElement(activity, page);
    fm.addElement(tile, activity);
    fm.focus(tile);

    return { page, summary, play, tile };
  };

  it('beams from the focused leaf, not its full-width row', () => {
    const { page, summary, play } = buildDetails();

    expect(press(page, Keys.Up)).toBe(false);
    expect(play.focused).toBe(true);
    expect(summary.focused).toBe(false);
  });

  it('does not pick the row the focused leaf sits in', () => {
    const page = place('page', { x: 0, y: 0, w: 1000, h: 600 }, true);
    const top = place('top', { x: 0, y: 0, w: 1000, h: 100 });
    const row = place('row', { x: 0, y: 200, w: 1000, h: 300 }, true);
    const tile = place('tile', { x: 0, y: 200, w: 200, h: 100 });
    fm.addElement(page);
    fm.addElement(top, page);
    fm.addElement(row, page);
    fm.addElement(tile, row);
    fm.focus(tile);

    expect(press(page, Keys.Down)).toBe(true);
    expect(tile.focused).toBe(true);
  });

  it('falls back to the row when nothing lines up with the leaf', () => {
    const page = place('page', { x: 0, y: 0, w: 1000, h: 600 }, true);
    const banner = place('banner', { x: 500, y: 0, w: 300, h: 100 });
    const row = place('row', { x: 0, y: 200, w: 1000, h: 100 }, true);
    const tile = place('tile', { x: 0, y: 200, w: 100, h: 100 });
    fm.addElement(page);
    fm.addElement(banner, page);
    fm.addElement(row, page);
    fm.addElement(tile, row);
    fm.focus(tile);

    expect(press(page, Keys.Up)).toBe(false);
    expect(banner.focused).toBe(true);
  });
});

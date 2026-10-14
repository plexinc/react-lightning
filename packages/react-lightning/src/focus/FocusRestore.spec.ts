import { beforeEach, describe, expect, it } from 'vitest';

import { MockElement } from '../mocks/createMockElement';
import { FocusManager, type FocusRect } from './FocusManager';

type Listener = (element: MockElement, value: boolean) => void;

class EmittingElement extends MockElement {
  private readonly _listeners = new Map<string, Set<Listener>>();

  public override on = ((event: string, listener: Listener) => {
    const listeners = this._listeners.get(event) ?? new Set();

    listeners.add(listener);
    this._listeners.set(event, listeners);

    return () => listeners.delete(listener);
  }) as unknown as MockElement['on'];

  public setVisible(visible: boolean, emit = true) {
    this.visible = visible;

    if (!emit) {
      return;
    }

    for (const listener of this._listeners.get('focusableChanged') ?? []) {
      listener(this, this.focusable);
    }
  }
}

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('focus restore for covered screens', () => {
  let fm: FocusManager<MockElement>;
  let nextId = 1;
  const rects = new Map<MockElement, FocusRect>();

  const make = (name: string, rect: FocusRect, group = false) => {
    const element = new EmittingElement(nextId++, name);

    element.isFocusGroup = group;
    rects.set(element, rect);

    return element;
  };

  const hide = (...elements: EmittingElement[]) => {
    for (const element of elements) {
      element.setVisible(false);
    }
  };

  const show = (...elements: EmittingElement[]) => {
    for (const element of elements) {
      element.setVisible(true);
    }
  };

  beforeEach(() => {
    nextId = 1;
    rects.clear();
    fm = new FocusManager({
      batchInitialFocus: true,
      measure: (element, out) => {
        const rect = rects.get(element);

        if (!rect) {
          return false;
        }

        Object.assign(out, rect);

        return true;
      },
    });
  });

  const build = () => {
    const app = make('app', { x: 0, y: 0, w: 1920, h: 1080 }, true);
    const tabs = make('tabs', { x: 0, y: 0, w: 1920, h: 128 }, true);
    const tab = make('tab', { x: 128, y: 40, w: 120, h: 48 });
    const home = make('home', { x: 0, y: 128, w: 1920, h: 952 }, true);
    const tile = make('tile', { x: 128, y: 560, w: 240, h: 360 });

    fm.addElement(app);
    fm.addElement(tabs, app);
    fm.addElement(tab, tabs);
    fm.addElement(home, app);
    fm.addElement(tile, home);

    return { app, tabs, tab, home, tile };
  };

  const cover = async ({ app, tabs, tab, home, tile }: ReturnType<typeof build>) => {
    hide(tab, tabs, tile, home);
    await flush();

    const screen = make('screen', { x: 0, y: 0, w: 1920, h: 1080 }, true);
    const button = make('button', { x: 128, y: 560, w: 240, h: 64 });

    fm.addElement(screen, app);
    fm.addElement(button, screen);
    fm.focus(button);
    await flush();

    return { screen, button };
  };

  it('hands focus back to the covered screen once it shows again', async () => {
    const tree = build();

    fm.focus(tree.tile);
    await flush();

    const { screen, button } = await cover(tree);

    expect(fm.focusPath).toEqual([tree.app, screen, button]);

    hide(button as EmittingElement, screen as EmittingElement);
    fm.removeElement(button);
    fm.removeElement(screen);
    show(tree.tab, tree.tabs);
    await flush();
    show(tree.tile, tree.home);
    await flush();

    expect(fm.focusPath).toEqual([tree.app, tree.home, tree.tile]);
    expect(tree.tab.focused).toBe(false);
  });

  it('leaves focus alone when it moved on before the covered screen showed', async () => {
    const tree = build();

    fm.focus(tree.tile);
    await flush();

    const { screen, button } = await cover(tree);

    show(tree.tab, tree.tabs);
    fm.focus(tree.tab);
    fm.removeElement(button);
    fm.removeElement(screen);
    show(tree.tile, tree.home);
    await flush();

    expect(fm.focusPath).toEqual([tree.app, tree.tabs, tree.tab]);
  });

  it('returns through two covers: home under a screen under a modal', async () => {
    const tree = build();

    fm.focus(tree.tile);
    await flush();

    const { screen, button } = await cover(tree);
    const second = make('second', { x: 0, y: 0, w: 1920, h: 1080 }, true);
    const option = make('option', { x: 600, y: 400, w: 240, h: 64 });

    hide(button as EmittingElement, screen as EmittingElement);
    await flush();
    fm.addElement(second, tree.app);
    fm.addElement(option, second);
    fm.focus(option);
    await flush();

    hide(option as EmittingElement, second as EmittingElement);
    fm.removeElement(option);
    fm.removeElement(second);
    show(button as EmittingElement, screen as EmittingElement);
    await flush();

    expect(fm.focusPath).toEqual([tree.app, screen, button]);

    hide(button as EmittingElement, screen as EmittingElement);
    fm.removeElement(button);
    fm.removeElement(screen);
    show(tree.tab, tree.tabs);
    await flush();
    show(tree.tile, tree.home);
    await flush();

    expect(fm.focusPath).toEqual([tree.app, tree.home, tree.tile]);
  });

  it('repicks when the focused screen hides but stays registered', async () => {
    const tree = build();
    const other = make('other', { x: 0, y: 128, w: 1920, h: 952 }, true);
    const otherTile = make('otherTile', { x: 128, y: 560, w: 240, h: 360 });

    fm.addElement(other, tree.app);
    fm.addElement(otherTile, other);
    hide(otherTile, other);
    fm.focus(tree.tile);
    await flush();

    show(otherTile, other);
    hide(tree.tile, tree.home);
    await flush();

    expect(fm.focusPath).not.toContain(tree.tile);
    expect(fm.focusPath).toEqual([tree.app, other, otherTile]);
  });

  it('keeps a nested group on its hidden item when the fallback hides in the same tick', async () => {
    const tree = build();
    const row = make('row', { x: 128, y: 560, w: 800, h: 64 }, true);
    const rate = make('rate', { x: 128, y: 560, w: 120, h: 64 });
    const review = make('review', { x: 260, y: 560, w: 120, h: 64 });

    fm.addElement(row, tree.home);
    fm.addElement(rate, row);
    fm.addElement(review, row);
    fm.focus(rate);
    await flush();

    hide(rate);
    hide(review, row, tree.tile, tree.home, tree.tab, tree.tabs);
    await flush();
    show(tree.tabs, tree.tab, row, tree.home);
    show(rate, review, tree.tile);
    await flush();

    expect(fm.focusPath).toEqual([tree.app, tree.home, row, rate]);
  });
  it('returns to a grid whose rows show again after the category list', async () => {
    const app = make('app', { x: 0, y: 0, w: 1920, h: 1080 }, true);
    const home = make('home', { x: 0, y: 128, w: 1920, h: 952 }, true);
    const cats = make('cats', { x: 128, y: 560, w: 200, h: 400 }, true);
    const cat = make('cat', { x: 128, y: 560, w: 200, h: 64 });
    const grid = make('grid', { x: 400, y: 560, w: 1400, h: 400 }, true);
    const list = make('list', { x: 400, y: 560, w: 1400, h: 400 }, true);
    const row = make('row', { x: 400, y: 560, w: 1400, h: 64 }, true);
    const cell = make('cell', { x: 400, y: 560, w: 300, h: 64 });

    fm.addElement(app);
    fm.addElement(home, app);
    fm.addElement(cats, home);
    fm.addElement(cat, cats);
    fm.addElement(grid, home);
    fm.addElement(list, grid);
    fm.addElement(row, list);
    fm.addElement(cell, row);
    fm.focus(cell);
    await flush();

    const all = [cat, cats, cell, row, list, grid];

    for (const element of all) {
      element.setVisible(false, false);
    }

    for (const element of all) {
      element.setVisible(false);
    }

    await flush();

    for (const element of all) {
      element.setVisible(true, false);
    }

    for (const element of all) {
      element.setVisible(true);
    }

    await flush();

    expect(fm.focusPath).toEqual([app, home, grid, list, row, cell]);
  });
});

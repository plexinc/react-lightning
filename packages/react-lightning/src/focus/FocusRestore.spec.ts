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

  public setVisible(visible: boolean) {
    this.visible = visible;

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
});

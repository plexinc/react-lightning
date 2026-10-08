import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Keys } from '../input/Keys';
import { createMockElement, type MockElement } from '../mocks/createMockElement';
import type { KeyEvent, LightningElement } from '../types';
import { FocusKeyManager } from './FocusKeyManager';
import { FocusManager, type FocusRect } from './FocusManager';

vi.mock('../utils/findClosestElement', () => ({
  findClosestElement: () => null,
  resolveDirectionalTarget: (_from: unknown, target: unknown) => target,
}));

const group = (id: number, name: string) => {
  const element = createMockElement(id, name);
  element.isFocusGroup = true;

  return element;
};

describe('focus regions', () => {
  let fm: FocusManager<MockElement>;
  let nextId = 1;
  const leaf = (name: string) => createMockElement(nextId++, name);
  const grp = (name: string) => group(nextId++, name);

  beforeEach(() => {
    fm = new FocusManager();
    nextId = 1;
  });

  describe('focusEntry', () => {
    const build = (focusEntry?: 'first' | 'last-focused' | 'spatial') => {
      const outside = leaf('outside');
      const region = grp('region');
      const a = leaf('a');
      const b = leaf('b');
      fm.addElement(outside);
      fm.addElement(region, null, { focusEntry });
      fm.addElement(a, region);
      fm.addElement(b, region);
      fm.focus(b);
      fm.focus(outside);

      return { region, a, b };
    };

    it('first enters at the first child even when another was focused', () => {
      const { region, a } = build('first');
      fm.focus(region);

      expect(a.focused).toBe(true);
    });

    it('last-focused enters at the remembered child', () => {
      const { region, b } = build('last-focused');
      fm.focus(region);

      expect(b.focused).toBe(true);
    });

    it('last-focused falls back to the first child when nothing is remembered', () => {
      const region = grp('region');
      const a = leaf('a');
      const b = leaf('b');
      fm.addElement(region, null, { focusEntry: 'last-focused' });
      fm.addElement(a, region);
      fm.addElement(b, region);
      fm.focusByKey('none');
      fm.focus(region);

      expect(a.focused).toBe(true);
    });

    it('spatial keeps the remembered child for programmatic focus', () => {
      const { region, b } = build('spatial');
      fm.focus(region);

      expect(b.focused).toBe(true);
    });

    it('first resets a nested first group on the way in', () => {
      const outer = grp('outer');
      const inner = grp('inner');
      const x = leaf('x');
      const y = leaf('y');
      const outside = leaf('outside');
      fm.addElement(outside);
      fm.addElement(outer);
      fm.addElement(inner, outer, { focusEntry: 'first' });
      fm.addElement(x, inner);
      fm.addElement(y, inner);
      fm.focus(y);
      fm.focus(outside);
      fm.focus(outer);

      expect(x.focused).toBe(true);
    });

    it('stops directional descent at first and last-focused regions', () => {
      const km = new FocusKeyManager(fm as unknown as FocusManager<LightningElement>);
      const first = grp('first');
      const last = grp('last');
      const spatial = grp('spatial');
      fm.addElement(first, null, { focusEntry: 'first' });
      fm.addElement(last, null, { focusEntry: 'last-focused' });
      fm.addElement(spatial, null, { focusEntry: 'spatial', focusRedirect: true });
      fm.addElement(leaf('c1'), first);
      fm.addElement(leaf('c2'), last);
      fm.addElement(leaf('c3'), spatial);

      const isRedirect = (km as unknown as { _isRedirect: (e: MockElement) => boolean })
        ._isRedirect;

      expect(isRedirect(first)).toBe(true);
      expect(isRedirect(last)).toBe(true);
      expect(isRedirect(spatial)).toBe(false);
    });
  });

  describe('rememberAs', () => {
    it('restores the child remembered under the value', () => {
      const outside = leaf('outside');
      const row = grp('row');
      const a = leaf('a');
      const b = leaf('b');
      fm.addElement(outside);
      fm.addElement(row, null, { rememberAs: 'one' });
      fm.addElement(a, row);
      fm.addElement(b, row);
      fm.focus(b);
      fm.focus(outside);

      fm.updateElement(row, { rememberAs: 'two' });
      fm.focus(row);

      expect(a.focused).toBe(true);

      fm.focus(outside);
      fm.updateElement(row, { rememberAs: 'one' });
      fm.focus(row);

      expect(b.focused).toBe(true);
    });

    it('moves focus to the first child when the new value has none', () => {
      const row = grp('row');
      const a = leaf('a');
      const b = leaf('b');
      fm.addElement(row, null, { rememberAs: 'one' });
      fm.addElement(a, row);
      fm.addElement(b, row);
      fm.focus(b);

      fm.updateElement(row, { rememberAs: 'two' });

      expect(a.focused).toBe(true);
    });

    it('forgets a nested list position when the new value has nothing remembered', () => {
      const outside = leaf('outside');
      const region = grp('region');
      const list = grp('list');
      const a = leaf('a');
      const b = leaf('b');
      fm.addElement(outside);
      fm.addElement(region, null, { rememberAs: 'one', focusEntry: 'last-focused' });
      fm.addElement(list, region);
      fm.addElement(a, list);
      fm.addElement(b, list);
      fm.focus(b);
      fm.focus(outside);

      fm.updateElement(region, { rememberAs: 'two', focusEntry: 'last-focused' });
      fm.focus(region);

      expect(a.focused).toBe(true);
    });

    it('restores a nested leaf by its key when the list recycled its cells', () => {
      const outside = leaf('outside');
      const region = grp('region');
      const list = grp('list');
      const a = leaf('a');
      const b = leaf('b');
      fm.addElement(outside);
      fm.addElement(region, null, { rememberAs: 'one', focusEntry: 'last-focused' });
      fm.addElement(list, region);
      fm.addElement(a, list, { focusKey: 'one-a' });
      fm.addElement(b, list, { focusKey: 'one-b' });
      fm.focus(b);
      fm.focus(outside);

      fm.updateElement(a, { focusKey: 'two-a' });
      fm.updateElement(b, { focusKey: 'two-b' });
      fm.updateElement(region, { rememberAs: 'two', focusEntry: 'last-focused' });
      fm.focus(region);

      expect(a.focused).toBe(true);

      fm.focus(outside);
      fm.updateElement(a, { focusKey: 'one-b' });
      fm.updateElement(b, { focusKey: 'one-a' });
      fm.updateElement(region, { rememberAs: 'one', focusEntry: 'last-focused' });
      fm.focus(region);

      expect(a.focused).toBe(true);
    });
  });

  describe('scopes and initial focus', () => {
    const pressDown = (target: MockElement) => {
      const km = new FocusKeyManager(fm as unknown as FocusManager<LightningElement>);

      km.handleKeyDown(target as unknown as LightningElement, { remoteKey: Keys.Down } as KeyEvent);
    };

    const region = (scope: MockElement, priority: number, withChild = true) => {
      const r = grp(`r${priority}`);
      fm.addElement(r, scope, { initialFocus: priority });
      const child = leaf(`c${priority}`);

      if (withChild) {
        fm.addElement(child, r);
      }

      return { r, child };
    };

    it('claims the highest priority', () => {
      const scope = grp('scope');
      fm.addElement(scope, null, { scope: true });
      const low = region(scope, 1);
      const high = region(scope, 5);

      expect(high.child.focused).toBe(true);
      expect(low.child.focused).toBe(false);
    });

    it('breaks a tie towards the first registered', () => {
      const scope = grp('scope');
      fm.addElement(scope, null, { scope: true });
      const first = region(scope, 2);
      const second = region(scope, 2);

      expect(first.child.focused).toBe(true);
      expect(second.child.focused).toBe(false);
    });

    it('lets a higher priority mounting later take over', () => {
      const scope = grp('scope');
      fm.addElement(scope, null, { scope: true });
      const low = region(scope, 1);

      expect(low.child.focused).toBe(true);

      const high = region(scope, 3);

      expect(high.child.focused).toBe(true);
    });

    it('stops taking over after the first directional key', () => {
      const scope = grp('scope');
      fm.addElement(scope, null, { scope: true });
      const low = region(scope, 1);
      pressDown(low.r);
      const high = region(scope, 3);

      expect(low.child.focused).toBe(true);
      expect(high.child.focused).toBe(false);
    });

    it('waits for the winner to have focusable content', () => {
      const scope = grp('scope');
      fm.addElement(scope, null, { scope: true });
      const early = region(scope, 1);
      const late = region(scope, 4, false);

      expect(early.child.focused).toBe(true);

      const lateChild = leaf('late');
      fm.addElement(lateChild, late.r);

      expect(lateChild.focused).toBe(true);
    });

    it('waits when the scope has only an empty winner', () => {
      const scope = grp('scope');
      fm.addElement(scope, null, { scope: true });
      const only = region(scope, 2, false);
      const child = leaf('child');

      expect(fm.focusPath).toEqual([]);

      fm.addElement(child, only.r);

      expect(child.focused).toBe(true);
    });

    it('does not claim while inactive, and claims once when activated', () => {
      const scope = grp('scope');
      fm.addElement(scope, null, { scope: true, scopeActive: false });
      const low = region(scope, 1);
      const high = region(scope, 5);

      expect(high.child.focused).toBe(false);

      fm.updateElement(scope, { scope: true, scopeActive: true });

      expect(high.child.focused).toBe(true);
      expect(low.child.focused).toBe(false);
    });

    it('restores the remembered item when re-activated', () => {
      const scope = grp('scope');
      fm.addElement(scope, null, { scope: true });
      const first = region(scope, 2);
      const other = leaf('other');
      fm.addElement(other, first.r);
      pressDown(first.r);
      fm.focus(other);
      const outside = leaf('outside');
      fm.addElement(outside);
      fm.updateElement(scope, { scope: true, scopeActive: false });
      fm.focus(outside);
      fm.updateElement(scope, { scope: true, scopeActive: true });

      expect(other.focused).toBe(true);
    });

    it('refocusInitial restarts the claim on the last activated scope', () => {
      const scope = grp('scope');
      fm.addElement(scope, null, { scope: true });
      const a = region(scope, 1);
      const b = region(scope, 1);
      pressDown(a.r);
      fm.focus(b.child);
      fm.refocusInitial();

      expect(a.child.focused).toBe(true);
    });

    it('leaves a nested scope to claim for itself', () => {
      const outer = grp('outer');
      const inner = grp('inner');
      fm.addElement(outer, null, { scope: true });
      fm.addElement(inner, outer, { scope: true });
      const outerRegion = region(outer, 1);
      const innerRegion = region(inner, 1);

      expect(outerRegion.child.focused || innerRegion.child.focused).toBe(true);
      expect(fm.focusPath).toContain(innerRegion.child);
    });
  });

  describe('removal repick', () => {
    const rects = new Map<MockElement, FocusRect>();
    let geo: FocusManager<MockElement>;

    beforeEach(() => {
      rects.clear();
      geo = new FocusManager({
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

    it('moves focus to the nearest remaining item, not the next by index', () => {
      const row = grp('row');
      const a = leaf('a');
      const b = leaf('b');
      const c = leaf('c');
      const d = leaf('d');
      rects.set(a, { x: 0, y: 0, w: 10, h: 10 });
      rects.set(b, { x: 100, y: 0, w: 10, h: 10 });
      rects.set(c, { x: 20, y: 0, w: 10, h: 10 });
      rects.set(d, { x: 200, y: 0, w: 10, h: 10 });
      geo.addElement(row);
      [a, b, c, d].forEach((e) => geo.addElement(e, row));
      geo.focus(b);
      geo.removeElement(b);

      expect(c.focused).toBe(true);
      expect(geo.focusPath).toEqual([row, c]);
    });

    it('falls back to the index pick without geometry', () => {
      const row = grp('row');
      const a = leaf('a');
      const b = leaf('b');
      const c = leaf('c');
      geo.addElement(row);
      [a, b, c].forEach((e) => geo.addElement(e, row));
      geo.focus(b);
      geo.removeElement(b);

      expect(c.focused).toBe(true);
    });

    it('lands on the next sibling when an unfocused remembered child goes away', () => {
      const row = grp('row');
      const a = leaf('a');
      const b = leaf('b');
      const c = leaf('c');
      const out = leaf('out');
      geo.addElement(out);
      geo.addElement(row);
      [a, b, c].forEach((e) => geo.addElement(e, row));
      geo.focus(b);
      geo.focus(out);
      geo.removeElement(b);
      geo.focus(row);

      expect(c.focused).toBe(true);
    });
  });

  describe('enter and leave', () => {
    it('fires once per boundary crossing', () => {
      const outside = leaf('outside');
      const region = grp('region');
      const a = leaf('a');
      const b = leaf('b');
      const onFocusEnter = vi.fn();
      const onFocusLeave = vi.fn();
      fm.addElement(outside);
      fm.addElement(region, null, { onFocusEnter, onFocusLeave });
      fm.addElement(a, region);
      fm.addElement(b, region);
      fm.focus(outside);
      onFocusEnter.mockClear();
      onFocusLeave.mockClear();

      fm.focus(a);
      fm.focus(b);

      expect(onFocusEnter).toHaveBeenCalledTimes(1);
      expect(onFocusLeave).not.toHaveBeenCalled();

      fm.focus(outside);

      expect(onFocusLeave).toHaveBeenCalledTimes(1);
    });

    it('does not fire when a removal repicks inside the region', () => {
      const region = grp('region');
      const a = leaf('a');
      const b = leaf('b');
      const onFocusEnter = vi.fn();
      const onFocusLeave = vi.fn();
      fm.addElement(region, null, { onFocusEnter, onFocusLeave });
      fm.addElement(a, region);
      fm.addElement(b, region);
      fm.focus(a);
      onFocusEnter.mockClear();
      fm.removeElement(a);

      expect(b.focused).toBe(true);
      expect(onFocusEnter).not.toHaveBeenCalled();
      expect(onFocusLeave).not.toHaveBeenCalled();
    });

    it('sends no leave when the focused region is removed', () => {
      const region = grp('region');
      const a = leaf('a');
      const onFocusLeave = vi.fn();
      fm.addElement(region, null, { onFocusLeave });
      fm.addElement(a, region);
      fm.focus(a);
      fm.removeElement(region);

      expect(onFocusLeave).not.toHaveBeenCalled();
    });
  });

  describe('updateElement', () => {
    it('replaces every option, clearing a key that was left out', () => {
      const a = leaf('a');
      fm.addElement(a, null, { focusKey: 'a', focusEntry: 'first' });
      fm.updateElement(a, {});

      expect(fm.getElementByKey('a')).toBeNull();
      expect(fm.getFocusNode(a)?.focusEntry).toBeNull();
    });

    it('swaps handlers without touching the rest', () => {
      const region = grp('region');
      const a = leaf('a');
      const first = vi.fn();
      const second = vi.fn();
      fm.addElement(region, null, { focusKey: 'region', onFocusEnter: first });
      fm.addElement(a, region);
      first.mockClear();
      fm.setHandlers(region, { onFocusEnter: second });
      const out = leaf('out');
      fm.addElement(out);
      fm.focus(out);
      fm.focus(a);

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
      expect(fm.getElementByKey('region')).toBe(region);
    });
  });

  describe('batched initial focus', () => {
    const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));
    let batch: FocusManager<MockElement>;
    const rects = new Map<MockElement, FocusRect>();

    beforeEach(() => {
      rects.clear();
      batch = new FocusManager({
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

    it('lands a claim without the first registered item taking focus', async () => {
      const scope = grp('scope');
      const first = leaf('first');
      const region = grp('region');
      const target = leaf('target');
      const firstFocus = vi.spyOn(first, 'focus');

      batch.addElement(first, scope);
      batch.addElement(target, region);
      batch.addElement(region, scope, { initialFocus: 1 });
      batch.addElement(scope, null, { scope: true });

      expect(target.focused).toBe(false);

      await flush();

      expect(target.focused).toBe(true);
      expect(firstFocus).not.toHaveBeenCalled();
    });

    it('holds the default pick while the claim winner has no content', async () => {
      const scope = grp('scope');
      const first = leaf('first');
      const region = grp('region');
      const later = leaf('later');

      batch.addElement(first, scope);
      batch.addElement(region, scope, { initialFocus: 1 });
      batch.addElement(scope, null, { scope: true });
      await flush();

      expect(first.focused).toBe(false);

      batch.addElement(later, region);
      await flush();

      expect(later.focused).toBe(true);
    });

    it('waits for the new items of a re-rendered list before repicking', async () => {
      const scope = grp('scope');
      const row = grp('row');
      const a = leaf('a');
      const b = leaf('b');
      rects.set(a, { x: 0, y: 0, w: 10, h: 10 });
      rects.set(b, { x: 20, y: 0, w: 10, h: 10 });
      batch.addElement(scope, null, { scope: true });
      batch.addElement(row, scope);
      batch.addElement(a, row);
      batch.addElement(b, row);
      await flush();
      batch.focus(b);

      batch.removeElement(a);
      batch.removeElement(b);
      const c = leaf('c');
      const d = leaf('d');
      rects.set(c, { x: 0, y: 0, w: 10, h: 10 });
      rects.set(d, { x: 20, y: 0, w: 10, h: 10 });
      batch.addElement(c, row);
      batch.addElement(d, row);
      await flush();

      expect(d.focused).toBe(true);
    });

    it('keeps the repick back while refocusInitial waits for its target to mount', async () => {
      const scope = grp('scope');
      const list = grp('list');
      const top = grp('top');
      const topTile = leaf('topTile');
      const row = leaf('row');
      const cell = leaf('cell');
      rects.set(row, { x: 0, y: 0, w: 10, h: 10 });
      rects.set(cell, { x: 0, y: 20, w: 10, h: 10 });
      batch.addElement(scope, null, { scope: true });
      batch.addElement(list, scope);
      batch.addElement(top, list, { initialFocus: 1 });
      batch.addElement(topTile, top);
      batch.addElement(row, list);
      batch.addElement(cell, list);
      await flush();
      batch.focus(cell);

      batch.removeElement(topTile);
      batch.removeElement(top);
      batch.refocusInitial();
      batch.removeElement(cell);
      await flush();

      expect(row.focused).toBe(false);

      const nextTop = grp('nextTop');
      const nextTile = leaf('nextTile');
      batch.addElement(nextTop, list, { initialFocus: 1 });
      batch.addElement(nextTile, nextTop);
      await flush();

      expect(nextTile.focused).toBe(true);
      expect(row.focused).toBe(false);
    });

    it('repicks once the refocusInitial wait runs out', async () => {
      vi.useFakeTimers();

      try {
        const scope = grp('scope');
        const list = grp('list');
        const row = leaf('row');
        const cell = leaf('cell');
        rects.set(row, { x: 0, y: 0, w: 10, h: 10 });
        rects.set(cell, { x: 0, y: 20, w: 10, h: 10 });
        batch.addElement(scope, null, { scope: true });
        batch.addElement(list, scope);
        batch.addElement(row, list);
        batch.addElement(cell, list);
        await vi.advanceTimersByTimeAsync(0);
        batch.focus(cell);

        batch.refocusInitial();
        batch.removeElement(cell);
        await vi.advanceTimersByTimeAsync(10);

        expect(row.focused).toBe(false);

        await vi.advanceTimersByTimeAsync(2000);

        expect(row.focused).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('entry details', () => {
    const rects = new Map<MockElement, FocusRect>();
    let geo: FocusManager<MockElement>;

    beforeEach(() => {
      rects.clear();
      geo = new FocusManager({
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

    it('enters first at the top-left item, not the first registered', () => {
      const outside = leaf('outside');
      const row = grp('row');
      const right = leaf('right');
      const left = leaf('left');
      rects.set(right, { x: 100, y: 0, w: 10, h: 10 });
      rects.set(left, { x: 0, y: 0, w: 10, h: 10 });
      geo.addElement(outside);
      geo.addElement(row, null, { focusEntry: 'first' });
      geo.addElement(right, row);
      geo.addElement(left, row);
      geo.focus(outside);
      geo.focus(row);

      expect(left.focused).toBe(true);
    });

    it('skips last-focused in destinationKeys for a group that never had focus', () => {
      const outside = leaf('outside');
      const row = grp('row');
      const a = leaf('a');
      const b = leaf('b');
      geo.addElement(outside);
      geo.addElement(row, null, { destinationKeys: ['last-focused', 'b'], focusRedirect: true });
      geo.addElement(a, row);
      geo.addElement(b, row, { focusKey: 'b' });
      geo.focus(outside);
      geo.focus(row);

      expect(b.focused).toBe(true);
    });

    it('re-enters an outer last-focused region at the exact remembered item', () => {
      const outside = leaf('outside');
      const outer = grp('outer');
      const inner = grp('inner');
      const a = leaf('a');
      const b = leaf('b');
      geo.addElement(outside);
      geo.addElement(outer, null, { focusEntry: 'last-focused' });
      geo.addElement(inner, outer, { focusEntry: 'first' });
      geo.addElement(a, inner);
      geo.addElement(b, inner);
      geo.focus(b);
      geo.focus(outside);
      geo.focus(outer);

      expect(b.focused).toBe(true);
    });
  });
});

import { describe, expect, it } from 'vitest';

import { Direction } from '../focus/Direction';
import type { LightningElement, Rect } from '../types';
import { resolveDirectionalTarget } from './findClosestElement';

type TestElement = LightningElement & {
  children: TestElement[];
  redirect: boolean;
  allowOffscreen: boolean;
};

function el(
  id: number,
  rect: Rect,
  opts: { children?: TestElement[]; redirect?: boolean; allowOffscreen?: boolean } = {},
): TestElement {
  return {
    id,
    node: { ...rect },
    focusable: true,
    focusableIntent: true,
    isFocusGroup: (opts.children?.length ?? 0) > 0,
    children: opts.children ?? [],
    redirect: opts.redirect ?? false,
    allowOffscreen: opts.allowOffscreen ?? false,
    getRelativePosition(this: LightningElement, relativeElement?: LightningElement) {
      return {
        x: (relativeElement?.node?.x ?? 0) + this.node.x,
        y: (relativeElement?.node?.y ?? 0) + this.node.y,
      };
    },
  } as unknown as TestElement;
}

const getFocusableChildren = (e: LightningElement): Iterable<LightningElement> =>
  (e as TestElement).children;
const isRedirect = (e: LightningElement): boolean => (e as TestElement).redirect;
const getAllowOffscreen = (e: LightningElement): boolean => (e as TestElement).allowOffscreen;

// EPG-shaped row below the source: a narrow channel header on the left and a
// wide airings guide on the right. The guide is a redirect node (it anchors on
// its own overlapping airing via the focus manager), so the descent should
// stop at it rather than the header or its inner cells.
const ROW_H = 120;
function airingRow(y: number) {
  const cellA = el(y + 1, { x: 110, y, w: 300, h: ROW_H });
  const cellB = el(y + 2, { x: 560, y, w: 300, h: ROW_H });
  const guide = el(
    y + 3,
    { x: 110, y, w: 1390, h: ROW_H },
    { children: [cellA, cellB], redirect: true, allowOffscreen: true },
  );
  const header = el(y + 4, { x: 0, y, w: 104, h: ROW_H });
  const row = el(y + 5, { x: 0, y, w: 1500, h: ROW_H }, { children: [header, guide] });
  return { row, header, guide, cellA, cellB };
}

describe('resolveDirectionalTarget', () => {
  it('descends to the airings guide (a redirect node), not the row-start header', () => {
    const below = airingRow(130);
    // Source airing mid-timeline, centerX 660 — over the guide, not the header.
    const source = el(999, { x: 560, y: 0, w: 200, h: ROW_H });

    const target = resolveDirectionalTarget(
      source,
      below.row,
      null,
      Direction.Down,
      getFocusableChildren,
      isRedirect,
      getAllowOffscreen,
    );

    expect(target).toBe(below.guide);
    expect(target).not.toBe(below.header);
    // Stops at the redirect guide; does not descend into its cells.
    expect(target).not.toBe(below.cellA);
    expect(target).not.toBe(below.cellB);
  });

  it('anchors on Up the same way', () => {
    const above = airingRow(0);
    const source = el(999, { x: 560, y: 130, w: 200, h: ROW_H });

    const target = resolveDirectionalTarget(
      source,
      above.row,
      null,
      Direction.Up,
      getFocusableChildren,
      isRedirect,
      getAllowOffscreen,
    );

    expect(target).toBe(above.guide);
  });

  it('descends through a non-redirect group to the overlapping leaf', () => {
    const leftLeaf = el(1, { x: 0, y: 130, w: 100, h: ROW_H });
    const rightLeaf = el(2, { x: 600, y: 130, w: 300, h: ROW_H }); // 600..900
    const group = el(3, { x: 0, y: 130, w: 900, h: ROW_H }, {
      children: [leftLeaf, rightLeaf],
      redirect: false,
    });
    // Source centerX 700 overlaps the right leaf.
    const source = el(999, { x: 600, y: 0, w: 200, h: ROW_H });

    const target = resolveDirectionalTarget(
      source,
      group,
      null,
      Direction.Down,
      getFocusableChildren,
      isRedirect,
      getAllowOffscreen,
    );

    expect(target).toBe(rightLeaf);
  });

  it('returns a redirect node as-is', () => {
    const inner = el(2, { x: 560, y: 130, w: 300, h: ROW_H });
    const guide = el(1, { x: 110, y: 130, w: 1390, h: ROW_H }, {
      children: [inner],
      redirect: true,
    });
    const source = el(999, { x: 560, y: 0, w: 200, h: ROW_H });

    const target = resolveDirectionalTarget(
      source,
      guide,
      null,
      Direction.Down,
      getFocusableChildren,
      isRedirect,
      getAllowOffscreen,
    );

    expect(target).toBe(guide);
  });

  it('returns a plain focusable leaf unchanged', () => {
    const leaf = el(1, { x: 0, y: 130, w: 300, h: ROW_H });
    const source = el(999, { x: 0, y: 0, w: 300, h: ROW_H });

    const target = resolveDirectionalTarget(
      source,
      leaf,
      null,
      Direction.Down,
      getFocusableChildren,
      isRedirect,
      getAllowOffscreen,
    );

    expect(target).toBe(leaf);
  });
});

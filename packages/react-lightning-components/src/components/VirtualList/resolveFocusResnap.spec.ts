import { describe, expect, it } from 'vitest';

import {
  type FocusAnchor,
  resolveFocusResnap,
  resolveFocusResnapScroll,
} from './resolveFocusResnap';

const anchor: FocusAnchor = {
  index: 3,
  cellOffset: 900,
  childOffset: 940,
  childSize: 300,
  align: 'start',
};

describe('resolveFocusResnap', () => {
  it('leaves an unmoved row alone', () => {
    expect(resolveFocusResnap(anchor, 900)).toBeUndefined();
  });

  it('ignores sub-pixel drift', () => {
    expect(resolveFocusResnap(anchor, 900.6)).toBeUndefined();
  });

  it('moves the child with its cell when a row above grows', () => {
    expect(resolveFocusResnap(anchor, 1020)).toEqual({
      ...anchor,
      cellOffset: 1020,
      childOffset: 1060,
    });
  });

  it('moves the child back when a row above shrinks', () => {
    expect(resolveFocusResnap(anchor, 850)?.childOffset).toBe(890);
  });
});

describe('resolveFocusResnapScroll', () => {
  const targetFor = (max: number) => (a: FocusAnchor) => Math.min(a.childOffset - 128, max);

  it('leaves a settled row alone', () => {
    expect(resolveFocusResnapScroll(anchor, 900, 812, targetFor(5000))).toBeUndefined();
  });

  it('re-scrolls when the scroll range grew after focus landed', () => {
    const result = resolveFocusResnapScroll(anchor, 900, 700, targetFor(5000));

    expect(result).toEqual({ anchor, target: 812 });
  });

  it('follows a moved cell', () => {
    const result = resolveFocusResnapScroll(anchor, 1020, 812, targetFor(5000));

    expect(result?.anchor.childOffset).toBe(1060);
    expect(result?.target).toBe(932);
  });
});

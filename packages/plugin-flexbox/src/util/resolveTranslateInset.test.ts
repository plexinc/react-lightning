import { describe, expect, it } from 'vitest';

import {
  resolveHorizontalTranslate,
  resolveVerticalTranslate,
} from './resolveTranslateInset';

describe('resolveTranslateInset', () => {
  it('left-anchored translateX offsets the left edge (base + translate)', () => {
    expect(resolveHorizontalTranslate(false, 0, 0, 40)).toEqual({ edge: 'left', value: 40 });
    expect(resolveHorizontalTranslate(false, 10, 0, 40)).toEqual({ edge: 'left', value: 50 });
  });

  it('right-anchored translateX offsets the right edge (base - translate)', () => {
    // docked at right:32; translateX 0 must keep it docked (not snap to left)
    expect(resolveHorizontalTranslate(true, 0, 32, 0)).toEqual({ edge: 'right', value: 32 });
    // sliding in from the right (+translate) pushes the right inset negative
    expect(resolveHorizontalTranslate(true, 0, 32, 100)).toEqual({ edge: 'right', value: -68 });
  });

  it('bottom-anchored translateY offsets the bottom edge (base - translate)', () => {
    expect(resolveVerticalTranslate(true, 0, 32, 0)).toEqual({ edge: 'bottom', value: 32 });
    expect(resolveVerticalTranslate(true, 0, 32, 100)).toEqual({ edge: 'bottom', value: -68 });
  });

  it('top-anchored translateY offsets the top edge (base + translate)', () => {
    expect(resolveVerticalTranslate(false, 0, 0, 40)).toEqual({ edge: 'top', value: 40 });
    expect(resolveVerticalTranslate(false, 5, 0, 40)).toEqual({ edge: 'top', value: 45 });
  });
});

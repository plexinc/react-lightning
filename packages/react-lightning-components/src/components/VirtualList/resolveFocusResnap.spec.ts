import { describe, expect, it } from 'vitest';

import { type FocusAnchor, resolveFocusResnap } from './resolveFocusResnap';

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

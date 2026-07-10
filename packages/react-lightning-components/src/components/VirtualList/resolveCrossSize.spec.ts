import { describe, expect, it } from 'vitest';

import { DEFAULT_ITEM_SIZE } from './LayoutManager';
import { resolveCrossSize } from './resolveCrossSize';

const base = {
  horizontal: false,
  explicitCross: undefined as number | undefined,
  parentCross: undefined as number | undefined,
  measuredOuterCross: 0,
  maxContentCross: 0,
  crossPadding: 0,
};

describe('resolveCrossSize', () => {
  it('prefers an explicit cross size and marks it definite', () => {
    const result = resolveCrossSize({ ...base, explicitCross: 400, parentCross: 300 });

    expect(result).toEqual({ viewportCrossSize: 400, isDefinite: true });
  });

  it('uses parent cell bounds for a vertical list and marks it definite', () => {
    const result = resolveCrossSize({ ...base, parentCross: 320, measuredOuterCross: 280 });

    expect(result).toEqual({ viewportCrossSize: 320, isDefinite: true });
  });

  it('uses the measured outer size for a vertical list and marks it definite', () => {
    const result = resolveCrossSize({ ...base, measuredOuterCross: 280, maxContentCross: 120 });

    expect(result).toEqual({ viewportCrossSize: 280, isDefinite: true });
  });

  it('ignores parent/measured cross for a horizontal list in favor of content', () => {
    const result = resolveCrossSize({
      ...base,
      horizontal: true,
      parentCross: 600,
      measuredOuterCross: 600,
      maxContentCross: 180,
      crossPadding: 10,
    });

    expect(result).toEqual({ viewportCrossSize: 190, isDefinite: false });
  });

  it('ignores parent cross for a horizontal list and falls back to the default', () => {
    // parentCross is the outer VL cell height (header + this list + siblings);
    // deriving the horizontal cross from it ratchets unbounded. Fall through to
    // the default and let content report the real size.
    const result = resolveCrossSize({ ...base, horizontal: true, parentCross: 600 });

    expect(result).toEqual({ viewportCrossSize: DEFAULT_ITEM_SIZE, isDefinite: false });
  });

  it('ignores the measured outer size for a horizontal list and falls back to the default', () => {
    const result = resolveCrossSize({ ...base, horizontal: true, measuredOuterCross: 600 });

    expect(result).toEqual({ viewportCrossSize: DEFAULT_ITEM_SIZE, isDefinite: false });
  });

  it('falls back to the default item size when nothing has measured', () => {
    const result = resolveCrossSize({ ...base });

    expect(result).toEqual({ viewportCrossSize: DEFAULT_ITEM_SIZE, isDefinite: false });
  });

  it('treats a zero explicit cross as unset', () => {
    const result = resolveCrossSize({ ...base, explicitCross: 0, parentCross: 320 });

    expect(result).toEqual({ viewportCrossSize: 320, isDefinite: true });
  });
});

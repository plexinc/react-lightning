import { describe, expect, it } from 'vitest';

import { computeItemRect } from './computeItemRect';
import type { ComputedLayout } from './LayoutManager';

const layout = (overrides: Partial<ComputedLayout> = {}): ComputedLayout => ({
  offset: 0,
  size: 0,
  column: 0,
  crossOffset: 0,
  crossSize: 0,
  ...overrides,
});

describe('computeItemRect', () => {
  it('maps a vertical item: offset → y, crossOffset → x', () => {
    const rect = computeItemRect(
      layout({ offset: 300, size: 100, crossOffset: 20, crossSize: 400 }),
      50, // itemAreaOffset (paddingStart + header)
      10, // paddingCross
      false,
    );

    expect(rect).toEqual({ x: 30, y: 350, width: 400, height: 100 });
  });

  it('maps a horizontal item: offset → x, crossOffset → y', () => {
    const rect = computeItemRect(
      layout({ offset: 300, size: 100, crossOffset: 20, crossSize: 400 }),
      50,
      10,
      true,
    );

    expect(rect).toEqual({ x: 350, y: 30, width: 100, height: 400 });
  });

  it('includes the item area offset and cross padding in the origin', () => {
    const rect = computeItemRect(layout({ offset: 0, size: 80, crossSize: 200 }), 120, 16, false);

    expect(rect.x).toBe(16);
    expect(rect.y).toBe(120);
  });

  it('places a multi-column cell at its column cross offset', () => {
    const rect = computeItemRect(
      layout({
        offset: 100,
        size: 100,
        column: 1,
        crossOffset: 200,
        crossSize: 200,
      }),
      0,
      0,
      false,
    );

    expect(rect).toEqual({ x: 200, y: 100, width: 200, height: 100 });
  });
});

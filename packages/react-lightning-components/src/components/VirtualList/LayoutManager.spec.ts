import { describe, expect, it } from 'vitest';

import { LayoutManager } from './LayoutManager';

const makeData = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));

describe('LayoutManager', () => {
  describe('single column', () => {
    it('positions items sequentially using estimatedItemSize', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
      });

      expect(lm.getLayout(0)).toEqual(expect.objectContaining({ offset: 0, size: 100 }));
      expect(lm.getLayout(1)).toEqual(expect.objectContaining({ offset: 100, size: 100 }));
      expect(lm.getLayout(2)).toEqual(expect.objectContaining({ offset: 200, size: 100 }));
      expect(lm.totalSize).toBe(300);
    });

    it('uses overrideItemLayout for custom sizes', () => {
      const sizes = [50, 100, 75];
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,

        overrideItemLayout: (layout, _item, index) => {
          layout.size = sizes[index];
        },
      });

      expect(lm.getLayout(0)?.size).toBe(50);
      expect(lm.getLayout(1)?.offset).toBe(50);
      expect(lm.getLayout(1)?.size).toBe(100);
      expect(lm.getLayout(2)?.offset).toBe(150);
      expect(lm.totalSize).toBe(225);
    });

    it('returns undefined for out-of-range index', () => {
      const lm = new LayoutManager({
        data: makeData(2),
        estimatedItemSize: 100,
        numColumns: 1,
      });

      expect(lm.getLayout(5)).toBeUndefined();
    });
  });

  describe('multi column', () => {
    it('positions items in a grid', () => {
      const lm = new LayoutManager({
        data: makeData(5),
        estimatedItemSize: 100,
        numColumns: 2,
      });

      // columnWidth = estimatedItemSize = 100
      // Row 0: items 0, 1
      expect(lm.getLayout(0)).toEqual(
        expect.objectContaining({
          offset: 0,
          column: 0,
          crossOffset: 0,
          crossSize: 100,
        }),
      );
      expect(lm.getLayout(1)).toEqual(
        expect.objectContaining({
          offset: 0,
          column: 1,
          crossOffset: 100,
          crossSize: 100,
        }),
      );
      // Row 1: items 2, 3
      expect(lm.getLayout(2)).toEqual(expect.objectContaining({ offset: 100, column: 0 }));
      expect(lm.getLayout(3)).toEqual(expect.objectContaining({ offset: 100, column: 1 }));
      // Row 2: item 4 (partial row)
      expect(lm.getLayout(4)).toEqual(expect.objectContaining({ offset: 200, column: 0 }));
      expect(lm.totalSize).toBe(300);
    });

    it('handles span override', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 3,
        overrideItemLayout: (layout, _item, index) => {
          if (index === 0) {
            layout.span = 2;
          }
        },
      });

      // columnWidth = estimatedItemSize = 100, span 2 = 200
      expect(lm.getLayout(0)?.crossSize).toBe(200);
      expect(lm.getLayout(0)?.column).toBe(0);
      // Item 1 fills remaining column in the same row
      expect(lm.getLayout(1)?.column).toBe(2);
      expect(lm.getLayout(1)?.crossSize).toBe(100);
    });

    it('clamps span to available columns', () => {
      const lm = new LayoutManager({
        data: makeData(2),
        estimatedItemSize: 100,
        numColumns: 2,
        overrideItemLayout: (layout) => {
          layout.span = 5; // more than numColumns
        },
      });

      // Span clamped to 2, crossSize = 2 * 100 = 200
      expect(lm.getLayout(0)?.crossSize).toBe(200);
    });
  });

  describe('separator size', () => {
    it('adds separator gap between items in single column', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,

        separatorSize: 10,
      });

      expect(lm.getLayout(0)).toEqual(expect.objectContaining({ offset: 0, size: 100 }));
      expect(lm.getLayout(1)).toEqual(expect.objectContaining({ offset: 110, size: 100 }));
      expect(lm.getLayout(2)).toEqual(expect.objectContaining({ offset: 220, size: 100 }));
      // totalSize = 3*100 + 2*10 = 320
      expect(lm.totalSize).toBe(320);
    });

    it('does not add separator gap between rows in multi column', () => {
      const lm = new LayoutManager({
        data: makeData(5),
        estimatedItemSize: 100,
        numColumns: 2,
        separatorSize: 20,
      });

      // Row 0: items 0, 1 at offset 0
      expect(lm.getLayout(0)?.offset).toBe(0);
      expect(lm.getLayout(1)?.offset).toBe(0);
      // Row 1: items 2, 3 at offset 100 (no separator between rows)
      expect(lm.getLayout(2)?.offset).toBe(100);
      expect(lm.getLayout(3)?.offset).toBe(100);
      // Row 2: item 4 at offset 200
      expect(lm.getLayout(4)?.offset).toBe(200);
      // totalSize = 3*100 = 300 (separators handled cross-axis by cell)
      expect(lm.totalSize).toBe(300);
    });
  });

  describe('visible range', () => {
    it('returns correct range for a window in the middle', () => {
      const lm = new LayoutManager({
        data: makeData(20),
        estimatedItemSize: 100,
        numColumns: 1,
      });

      // scroll=500, viewport=300, draw=100 → range 400..900
      const range = lm.getVisibleRange(500, 300, 100);
      expect(range.startIndex).toBe(4);
      expect(range.endIndex).toBe(8);
    });

    it('returns empty range for empty data', () => {
      const lm = new LayoutManager({
        data: [],
        estimatedItemSize: 100,
        numColumns: 1,
      });
      expect(lm.getVisibleRange(0, 300, 100)).toEqual({
        startIndex: 0,
        endIndex: -1,
      });
    });

    it('clamps to data bounds', () => {
      const lm = new LayoutManager({
        data: makeData(5),
        estimatedItemSize: 100,
        numColumns: 1,
      });

      const range = lm.getVisibleRange(0, 1000, 500);
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(4);
    });

    it('handles scroll at the very end', () => {
      const lm = new LayoutManager({
        data: makeData(10),
        estimatedItemSize: 100,
        numColumns: 1,
      });

      const range = lm.getVisibleRange(800, 200, 0);
      expect(range.startIndex).toBe(8);
      expect(range.endIndex).toBe(9);
    });
  });

  describe('reportItemSize', () => {
    it('returns true and marks dirty when size changes', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
      });
      lm.getLayout(0); // force initial compute

      const changed = lm.reportItemSize(0, 150);
      expect(changed).toBe(true);
      expect(lm.getLayout(1)?.offset).toBe(150);
    });

    it('returns false when size is unchanged', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
      });
      lm.getLayout(0);

      expect(lm.reportItemSize(0, 100)).toBe(false);
    });

    it('updates averageItemSize after reports', () => {
      const lm = new LayoutManager({
        data: makeData(5),
        estimatedItemSize: 100,
        numColumns: 1,
      });
      lm.getLayout(0);

      lm.reportItemSize(0, 200);
      lm.reportItemSize(1, 200);
      expect(lm.averageItemSize).toBe(200);
    });
  });

  describe('updateConfig', () => {
    it('recomputes layouts after data change', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
      });
      expect(lm.totalSize).toBe(300);

      lm.updateConfig({ data: makeData(5) });
      expect(lm.totalSize).toBe(500);
    });
  });

  describe('deferMeasurement / flushDeferred', () => {
    it('buffers measurements and applies them on flush', () => {
      const lm = new LayoutManager({
        data: makeData(5),
        estimatedItemSize: 100,
        numColumns: 1,
      });
      lm.getLayout(0);

      lm.deferMeasurement(0, 150, 100);
      lm.deferMeasurement(1, 200, 100);
      expect(lm.hasPendingMeasurements).toBe(true);

      const result = lm.flushDeferred();
      expect(result.changed).toBe(true);
      expect(lm.hasPendingMeasurements).toBe(false);
      expect(lm.getLayout(0)?.size).toBe(150);
      expect(lm.getLayout(1)?.size).toBe(200);
    });

    it('returns anchorDelta when anchor shifts', () => {
      const lm = new LayoutManager({
        data: makeData(5),
        estimatedItemSize: 100,
        numColumns: 1,
      });
      lm.getLayout(0);

      // Item 0 grows from 100 → 200. The average also shifts to 200,
      // so unmeasured item 1 is re-estimated at 200. Total delta for item 2: +200.
      lm.deferMeasurement(0, 200, 100);
      const result = lm.flushDeferred(2);
      expect(result.anchorDelta).toBe(200);
    });

    it('returns zero delta when no anchor provided', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
      });
      lm.getLayout(0);

      lm.deferMeasurement(0, 200, 100);
      const result = lm.flushDeferred();
      expect(result.anchorDelta).toBe(0);
    });

    it('returns unchanged when no measurements are pending', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
      });
      lm.getLayout(0);

      expect(lm.hasPendingMeasurements).toBe(false);
      const result = lm.flushDeferred(0);
      expect(result.changed).toBe(false);
      expect(result.anchorDelta).toBe(0);
    });

    it('returns unchanged when deferred sizes match current', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
      });
      lm.getLayout(0);

      lm.deferMeasurement(0, 100, 100);
      const result = lm.flushDeferred(1);
      expect(result.changed).toBe(false);
      expect(result.anchorDelta).toBe(0);
    });

    it('clear also clears pending measurements', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
      });

      lm.deferMeasurement(0, 200, 100);
      lm.clear();
      expect(lm.hasPendingMeasurements).toBe(false);
    });
  });

  describe('clear', () => {
    it('resets all state', () => {
      const lm = new LayoutManager({
        data: makeData(5),
        estimatedItemSize: 100,
        numColumns: 1,
      });
      lm.getLayout(0);
      lm.reportItemSize(0, 200);
      lm.clear();

      // Data still exists so totalSize recomputes from estimated sizes
      expect(lm.totalSize).toBe(500);
      // Average was cleared, so falls back to estimatedItemSize
      expect(lm.averageItemSize).toBe(100);
    });
  });
});

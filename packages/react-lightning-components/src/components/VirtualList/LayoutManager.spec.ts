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
        cellCrossSize: 200,
      });

      expect(lm.getLayout(0)).toEqual(
        expect.objectContaining({ offset: 0, size: 100, crossSize: 200 }),
      );
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
        cellCrossSize: 200,
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
        cellCrossSize: 200,
      });

      expect(lm.getLayout(5)).toBeUndefined();
    });

    it('collapses null data entries to size 0', () => {
      const data: Array<{ id: number } | null> = [{ id: 0 }, null, { id: 2 }];
      const lm = new LayoutManager({
        data,
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
      });

      expect(lm.getLayout(0)?.size).toBe(100);
      expect(lm.getLayout(1)?.size).toBe(0);
      expect(lm.getLayout(1)?.offset).toBe(100);
      expect(lm.getLayout(2)?.offset).toBe(100);
      expect(lm.totalSize).toBe(200);
    });

    it('collapses undefined data entries to size 0', () => {
      const data: Array<{ id: number } | undefined> = [{ id: 0 }, undefined, { id: 2 }];
      const lm = new LayoutManager({
        data,
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
      });

      expect(lm.getLayout(1)?.size).toBe(0);
      expect(lm.getLayout(2)?.offset).toBe(100);
    });

    it('honours override.size = 0 to collapse a row', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        overrideItemLayout: (layout, _item, index) => {
          if (index === 1) {
            layout.size = 0;
          }
        },
      });

      expect(lm.getLayout(1)?.size).toBe(0);
      expect(lm.getLayout(2)?.offset).toBe(100);
      expect(lm.totalSize).toBe(200);
    });
  });

  describe('multi column', () => {
    it('positions items in a grid using cellCrossSize', () => {
      const lm = new LayoutManager({
        data: makeData(5),
        estimatedItemSize: 100,
        numColumns: 2,
        cellCrossSize: 100,
      });

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
      expect(lm.getLayout(2)).toEqual(expect.objectContaining({ offset: 100, column: 0 }));
      expect(lm.getLayout(3)).toEqual(expect.objectContaining({ offset: 100, column: 1 }));
      expect(lm.getLayout(4)).toEqual(expect.objectContaining({ offset: 200, column: 0 }));
      expect(lm.totalSize).toBe(300);
    });

    it('handles span override (crossSize scales with span)', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 3,
        cellCrossSize: 100,
        overrideItemLayout: (layout, _item, index) => {
          if (index === 0) {
            layout.span = 2;
          }
        },
      });

      expect(lm.getLayout(0)?.crossSize).toBe(200);
      expect(lm.getLayout(0)?.column).toBe(0);
      expect(lm.getLayout(1)?.column).toBe(2);
      expect(lm.getLayout(1)?.crossSize).toBe(100);
    });

    it('clamps span to available columns', () => {
      const lm = new LayoutManager({
        data: makeData(2),
        estimatedItemSize: 100,
        numColumns: 2,
        cellCrossSize: 100,
        overrideItemLayout: (layout) => {
          layout.span = 5;
        },
      });

      expect(lm.getLayout(0)?.crossSize).toBe(200);
    });
  });

  describe('separator size', () => {
    it('adds separator gap between items in single column', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        separatorSize: 10,
      });

      expect(lm.getLayout(0)).toEqual(expect.objectContaining({ offset: 0, size: 100 }));
      expect(lm.getLayout(1)).toEqual(expect.objectContaining({ offset: 110, size: 100 }));
      expect(lm.getLayout(2)).toEqual(expect.objectContaining({ offset: 220, size: 100 }));
      expect(lm.totalSize).toBe(320);
    });

    it('does not add separator gap between rows in multi column', () => {
      const lm = new LayoutManager({
        data: makeData(5),
        estimatedItemSize: 100,
        numColumns: 2,
        cellCrossSize: 100,
        separatorSize: 20,
      });

      expect(lm.getLayout(0)?.offset).toBe(0);
      expect(lm.getLayout(1)?.offset).toBe(0);
      expect(lm.getLayout(2)?.offset).toBe(100);
      expect(lm.getLayout(3)?.offset).toBe(100);
      expect(lm.getLayout(4)?.offset).toBe(200);
      expect(lm.totalSize).toBe(300);
    });

    it('does not add separator gap after a zero-size empty row', () => {
      const data: Array<{ id: number } | null> = [{ id: 0 }, null, { id: 2 }];
      const lm = new LayoutManager({
        data,
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        separatorSize: 10,
      });

      expect(lm.getLayout(0)?.offset).toBe(0);
      expect(lm.getLayout(1)?.offset).toBe(110);
      expect(lm.getLayout(1)?.size).toBe(0);
      expect(lm.getLayout(2)?.offset).toBe(110);
    });
  });

  describe('visible range', () => {
    it('returns correct range for a window in the middle', () => {
      const lm = new LayoutManager({
        data: makeData(20),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
      });

      const range = lm.getVisibleRange(500, 300, 100);
      expect(range.startIndex).toBe(4);
      expect(range.endIndex).toBe(8);
    });

    it('returns empty range for empty data', () => {
      const lm = new LayoutManager({
        data: [],
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
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
        cellCrossSize: 200,
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
        cellCrossSize: 200,
      });

      const range = lm.getVisibleRange(800, 200, 0);
      expect(range.startIndex).toBe(8);
      expect(range.endIndex).toBe(9);
    });
  });

  describe('findIndexAtOffset', () => {
    it('locates the index at a given main-axis offset', () => {
      const lm = new LayoutManager({
        data: makeData(5),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
      });

      expect(lm.findIndexAtOffset(0)).toBe(0);
      expect(lm.findIndexAtOffset(50)).toBe(0);
      expect(lm.findIndexAtOffset(100)).toBe(1);
      expect(lm.findIndexAtOffset(250)).toBe(2);
    });

    it('returns -1 for empty data', () => {
      const lm = new LayoutManager({
        data: [],
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
      });

      expect(lm.findIndexAtOffset(0)).toBe(-1);
    });
  });

  describe('reportItemSize', () => {
    it('uses measured size in subsequent layouts', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        keyExtractor: (item) => String(item.id),
      });

      expect(lm.getLayout(1)?.offset).toBe(100);

      const changed = lm.reportItemSize('0', 150);
      expect(changed).toBe(true);
      expect(lm.getLayout(1)?.offset).toBe(150);
      expect(lm.totalSize).toBe(350);
    });

    it('measurement wins over override', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        keyExtractor: (item) => String(item.id),
        overrideItemLayout: (layout) => {
          layout.size = 80;
        },
      });

      expect(lm.getLayout(0)?.size).toBe(80);

      lm.reportItemSize('0', 120);
      expect(lm.getLayout(0)?.size).toBe(120);
      expect(lm.getLayout(1)?.offset).toBe(120);
    });

    it('returns false for zero or negative sizes', () => {
      const lm = new LayoutManager({
        data: makeData(2),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        keyExtractor: (item) => String(item.id),
      });

      expect(lm.reportItemSize('0', 0)).toBe(false);
      expect(lm.reportItemSize('0', -5)).toBe(false);
      expect(lm.getLayout(0)?.size).toBe(100);
    });

    it('returns false when reported size matches stored value', () => {
      const lm = new LayoutManager({
        data: makeData(2),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        keyExtractor: (item) => String(item.id),
      });

      lm.reportItemSize('0', 150);
      expect(lm.reportItemSize('0', 150)).toBe(false);
      expect(lm.reportItemSize('0', 150.4)).toBe(false);
      expect(lm.reportItemSize('0', 152)).toBe(true);
    });

    it('measurements survive index shifts (keyed by userKey)', () => {
      const data = makeData(3);
      const lm = new LayoutManager({
        data,
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        keyExtractor: (item) => String(item.id),
      });

      lm.reportItemSize('1', 150);
      expect(lm.getLayout(1)?.size).toBe(150);

      // Insert a new item at the front — id=1 is now at index 2.
      const newData = [{ id: 99 }, ...data];
      lm.updateConfig({ data: newData });

      expect(lm.getLayout(0)?.size).toBe(100);
      expect(lm.getLayout(1)?.size).toBe(100);
      expect(lm.getLayout(2)?.size).toBe(150);
    });

    it('falls back to estimate when no keyExtractor is provided', () => {
      const lm = new LayoutManager({
        data: makeData(2),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
      });

      lm.reportItemSize('0', 150);
      expect(lm.getLayout(0)?.size).toBe(100);
    });

    it('null/undefined data overrides measurement (collapses to 0)', () => {
      const data: Array<{ id: number } | null> = [{ id: 0 }, null];
      const lm = new LayoutManager({
        data,
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        keyExtractor: (item) => String(item.id),
      });

      lm.reportItemSize('1', 150);
      expect(lm.getLayout(1)?.size).toBe(0);
    });

    it('first measurement becomes the implicit estimate for later unmeasured items', () => {
      const lm = new LayoutManager({
        data: makeData(4),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        keyExtractor: (item) => String(item.id),
      });

      // Before any measurement: items use the caller's estimatedItemSize.
      expect(lm.getLayout(2)?.size).toBe(100);

      // First measurement comes in. Items 1,2,3 are still unmeasured but
      // should now use 150 (the first-measured size) as the fallback.
      lm.reportItemSize('0', 150);
      expect(lm.getLayout(0)?.size).toBe(150);
      expect(lm.getLayout(1)?.size).toBe(150);
      expect(lm.getLayout(2)?.size).toBe(150);
    });

    it('later measurements do NOT update the implicit estimate', () => {
      const lm = new LayoutManager({
        data: makeData(5),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        keyExtractor: (item) => String(item.id),
      });

      lm.reportItemSize('0', 100);
      lm.reportItemSize('1', 200);

      // Item 0 measured at 100, item 1 measured at 200, but the implicit
      // estimate stays locked at 100 (the first measurement). Items 2-4
      // use 100 until they're measured individually.
      expect(lm.getLayout(0)?.size).toBe(100);
      expect(lm.getLayout(1)?.size).toBe(200);
      expect(lm.getLayout(2)?.size).toBe(100);
      expect(lm.getLayout(3)?.size).toBe(100);
    });

    it('reportItemEmpty collapses the row to size 0', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        keyExtractor: (item) => String(item.id),
      });

      expect(lm.getLayout(1)?.size).toBe(100);

      expect(lm.reportItemEmpty('1')).toBe(true);
      expect(lm.getLayout(1)?.size).toBe(0);
      expect(lm.getLayout(2)?.offset).toBe(100);
      expect(lm.totalSize).toBe(200);
    });

    it('reportItemEmpty is idempotent', () => {
      const lm = new LayoutManager({
        data: makeData(2),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        keyExtractor: (item) => String(item.id),
      });

      expect(lm.reportItemEmpty('0')).toBe(true);
      expect(lm.reportItemEmpty('0')).toBe(false);
    });

    it('per-item override.size wins over the implicit estimate', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
        keyExtractor: (item) => String(item.id),
        overrideItemLayout: (layout, _item, index) => {
          if (index === 2) {
            layout.size = 75;
          }
        },
      });

      lm.reportItemSize('0', 200);

      expect(lm.getLayout(0)?.size).toBe(200); // measured
      expect(lm.getLayout(1)?.size).toBe(200); // first-measured fallback
      expect(lm.getLayout(2)?.size).toBe(75); // override.size wins
    });
  });

  describe('updateConfig', () => {
    it('recomputes layouts after data change', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
      });
      expect(lm.totalSize).toBe(300);

      expect(lm.updateConfig({ data: makeData(5) })).toBe(true);
      expect(lm.totalSize).toBe(500);
    });

    it('recomputes when cellCrossSize changes', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
      });

      expect(lm.updateConfig({ cellCrossSize: 300 })).toBe(true);
      expect(lm.getLayout(0)?.crossSize).toBe(300);
    });

    it('returns false when nothing changed', () => {
      const lm = new LayoutManager({
        data: makeData(3),
        estimatedItemSize: 100,
        numColumns: 1,
        cellCrossSize: 200,
      });

      expect(lm.updateConfig({ estimatedItemSize: 100, numColumns: 1 })).toBe(false);
    });
  });
});

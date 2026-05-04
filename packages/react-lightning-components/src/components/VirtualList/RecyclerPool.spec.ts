import { describe, expect, it } from 'vitest';

import { RecyclerPool } from './RecyclerPool';

describe('RecyclerPool', () => {
  it('assigns unique slot keys to visible items', () => {
    const pool = new RecyclerPool();
    const slots = pool.reconcile([0, 1, 2], () => 'default');

    expect(slots.size).toBe(3);
    const keys = [...slots.values()];
    expect(new Set(keys).size).toBe(3);
  });

  it('reuses slots when items scroll out and new ones enter', () => {
    const pool = new RecyclerPool();

    pool.reconcile([0, 1, 2], () => 'default');
    expect(pool.activeCount).toBe(3);

    // Scroll: 0 and 1 leave, 3 and 4 enter
    const slots = pool.reconcile([2, 3, 4], () => 'default');
    expect(pool.activeCount).toBe(3);
    expect(pool.pooledCount).toBe(0); // all reused
    expect(slots.size).toBe(3);
  });

  it('keeps stable keys for items that remain visible', () => {
    const pool = new RecyclerPool();

    const slots1 = pool.reconcile([0, 1, 2], () => 'default');
    // oxlint-disable-next-line typescript/no-non-null-assertion -- key was just inserted
    const key1 = slots1.get(1)!;

    const slots2 = pool.reconcile([1, 2, 3], () => 'default');
    expect(slots2.get(1)).toBe(key1);
  });

  it('separates pools by item type', () => {
    const pool = new RecyclerPool();
    const getType = (index: number) => (index % 2 === 0 ? 'even' : 'odd');

    const slots1 = pool.reconcile([0, 1], getType);
    // oxlint-disable-next-line typescript/no-non-null-assertion -- keys were just inserted
    const evenKey = slots1.get(0)!;
    // oxlint-disable-next-line typescript/no-non-null-assertion -- keys were just inserted
    const oddKey = slots1.get(1)!;

    // Replace both: even→even, odd→odd
    const slots2 = pool.reconcile([2, 3], getType);
    expect(slots2.get(2)).toBe(evenKey);
    expect(slots2.get(3)).toBe(oddKey);
  });

  it('does not reuse slots across types', () => {
    const pool = new RecyclerPool();
    const getType = (index: number) => (index < 2 ? 'a' : 'b');

    const slots1 = pool.reconcile([0, 1], getType);
    // oxlint-disable-next-line typescript/no-non-null-assertion -- keys were just inserted
    const keyA0 = slots1.get(0)!;
    // oxlint-disable-next-line typescript/no-non-null-assertion -- keys were just inserted
    const keyA1 = slots1.get(1)!;

    // Both old slots are type 'a', new items are type 'b'
    const slots2 = pool.reconcile([2, 3], getType);
    // New keys should be created, not reused from type 'a'
    expect(slots2.get(2)).not.toBe(keyA0);
    expect(slots2.get(2)).not.toBe(keyA1);
    expect(slots2.get(3)).not.toBe(keyA0);
    expect(slots2.get(3)).not.toBe(keyA1);
  });

  it('clears all state', () => {
    const pool = new RecyclerPool();
    pool.reconcile([0, 1, 2], () => 'default');
    pool.clear();

    expect(pool.activeCount).toBe(0);
    expect(pool.pooledCount).toBe(0);
  });

  it('handles empty visible list', () => {
    const pool = new RecyclerPool();
    pool.reconcile([0, 1], () => 'default');

    const slots = pool.reconcile([], () => 'default');
    expect(slots.size).toBe(0);
    expect(pool.activeCount).toBe(0);
    expect(pool.pooledCount).toBe(2);
  });

  it('getSlotKey returns key for active items', () => {
    const pool = new RecyclerPool();
    pool.reconcile([5, 6], () => 'default');

    expect(pool.getSlotKey(5)).toBeDefined();
    expect(pool.getSlotKey(99)).toBeUndefined();
  });

  it('getPooledSlots returns released slots paired with their last index', () => {
    const pool = new RecyclerPool();

    const slots1 = pool.reconcile([0, 1, 2], () => 'default');
    // oxlint-disable-next-line typescript/no-non-null-assertion -- key was just inserted
    const keyForIndex0 = slots1.get(0)!;

    // 0 leaves visibility, 3 enters. Slot for 0 is now pooled but reused for 3.
    pool.reconcile([1, 2, 3], () => 'default');

    // No fully-released slots (keyForIndex0 was repurposed).
    expect(pool.getPooledSlots()).toEqual([]);

    // Drop down to two visible items — slot for index 3 is released without reuse.
    pool.reconcile([1, 2], () => 'default');

    const pooled = pool.getPooledSlots();
    expect(pooled).toHaveLength(1);
    expect(pooled[0]).toEqual({ slotKey: keyForIndex0, lastIndex: 3 });
  });

  it('getPooledSlots is empty after clear', () => {
    const pool = new RecyclerPool();

    pool.reconcile([0, 1], () => 'default');
    pool.reconcile([], () => 'default');
    expect(pool.getPooledSlots()).toHaveLength(2);

    pool.clear();
    expect(pool.getPooledSlots()).toEqual([]);
  });
});

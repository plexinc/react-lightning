import { describe, expect, it } from 'vitest';
import { ShelfPacker, type Slot } from './TextAtlas';

describe('ShelfPacker', () => {
  const slot: Slot = { shelf: 0, x: 0, y: 0, w: 0, h: 0, dirty: false };

  it('fills a shelf left to right, then opens the next', () => {
    const p = new ShelfPacker(100, 100);

    expect(p.alloc(60, 20, slot)).toBe(true);
    expect([slot.x, slot.y, slot.h]).toEqual([0, 0, 24]);
    expect(p.alloc(40, 18, slot)).toBe(true);
    expect([slot.x, slot.y]).toEqual([60, 0]);
    expect(p.alloc(10, 20, slot)).toBe(true);
    expect([slot.x, slot.y]).toEqual([0, 24]);
  });

  it('keeps short items off tall shelves', () => {
    const p = new ShelfPacker(100, 100);

    p.alloc(10, 40, slot);
    p.alloc(10, 10, slot);
    expect(slot.y).toBe(40);
  });

  it('reports a full page and starts over after reset', () => {
    const p = new ShelfPacker(50, 50);

    expect(p.alloc(50, 48, slot)).toBe(true);
    expect(p.alloc(10, 10, slot)).toBe(false);
    expect(p.alloc(51, 1, slot)).toBe(false);
    p.reset();
    expect(p.alloc(10, 10, slot)).toBe(true);
    expect([slot.x, slot.y]).toEqual([0, 0]);
  });

  it('reuses freed slots for narrower items and splits the rest', () => {
    const p = new ShelfPacker(100, 16);

    p.alloc(50, 16, slot);
    p.alloc(50, 16, slot);
    expect(p.alloc(10, 16, slot)).toBe(false);
    p.free(0, 0, 50);
    expect(p.alloc(30, 16, slot)).toBe(true);
    expect([slot.x, slot.w]).toEqual([0, 30]);
    expect(p.alloc(18, 16, slot)).toBe(true);
    expect([slot.x, slot.w]).toEqual([30, 20]);
  });

  it('pulls the shelf end back over freed slots at the end', () => {
    const p = new ShelfPacker(100, 16);

    p.alloc(40, 16, slot);
    p.alloc(40, 16, slot);
    p.free(0, 0, 40);
    p.free(0, 40, 40);
    expect(p.alloc(100, 16, slot)).toBe(true);
    expect(slot.x).toBe(0);
    expect(slot.dirty).toBe(true);
  });

  it('marks only never-used space clean', () => {
    const p = new ShelfPacker(100, 16);

    p.alloc(40, 16, slot);
    expect(slot.dirty).toBe(false);
    p.free(0, 0, 40);
    p.alloc(30, 16, slot);
    expect(slot.dirty).toBe(true);
    p.alloc(30, 16, slot);
    expect([slot.x, slot.dirty]).toEqual([30, true]);
    p.alloc(30, 16, slot);
    expect([slot.x, slot.dirty]).toEqual([60, false]);
  });
});

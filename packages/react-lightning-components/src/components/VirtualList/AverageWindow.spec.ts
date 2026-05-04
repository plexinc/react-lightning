import { describe, expect, it } from 'vitest';

import { AverageWindow } from './AverageWindow';

describe('AverageWindow', () => {
  it('returns 0 when empty', () => {
    const w = new AverageWindow();
    expect(w.currentValue).toBe(0);
    expect(w.count).toBe(0);
  });

  it('computes average of added values', () => {
    const w = new AverageWindow(5);
    w.addValue(10);
    w.addValue(20);
    expect(w.currentValue).toBe(15);
    expect(w.count).toBe(2);
  });

  it('evicts oldest values when window is full', () => {
    const w = new AverageWindow(3);
    w.addValue(10);
    w.addValue(20);
    w.addValue(30);
    expect(w.currentValue).toBe(20); // (10+20+30)/3

    w.addValue(40);
    expect(w.currentValue).toBe(30); // (20+30+40)/3
    expect(w.count).toBe(3);
  });

  it('clears all values', () => {
    const w = new AverageWindow(5);
    w.addValue(10);
    w.addValue(20);
    w.clear();
    expect(w.currentValue).toBe(0);
    expect(w.count).toBe(0);
  });

  it('handles window size of 1', () => {
    const w = new AverageWindow(1);
    w.addValue(10);
    expect(w.currentValue).toBe(10);
    w.addValue(20);
    expect(w.currentValue).toBe(20);
    expect(w.count).toBe(1);
  });

  it('enforces minimum window size of 1', () => {
    const w = new AverageWindow(0);
    w.addValue(42);
    expect(w.currentValue).toBe(42);
    expect(w.count).toBe(1);
  });
});

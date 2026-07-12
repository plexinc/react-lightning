import { describe, expect, it } from 'vitest';

import {
  collectSharedValueReads,
  instrumentSharedValue,
  nextTrackingListenerId,
} from './sharedValueTracking';

// Mirrors the shape reanimated's makeMutableWeb builds: an object literal with
// `value` as an own configurable accessor plus a listener map.
function makeWebMutable<T>(initial: T) {
  let value = initial;
  const listeners = new Map<number, (next: T) => void>();
  const mutable = {
    get value(): T {
      return value;
    },
    set value(next: T) {
      value = next;
      listeners.forEach((listener) => listener(next));
    },
    addListener: (id: number, listener: (next: T) => void) => {
      listeners.set(id, listener);
    },
    removeListener: (id: number) => {
      listeners.delete(id);
    },
    listenerCount: () => listeners.size,
  };

  return mutable;
}

describe('sharedValueTracking', () => {
  it('collects reads of instrumented values inside the collector', () => {
    const a = instrumentSharedValue(makeWebMutable(1));
    const b = instrumentSharedValue(makeWebMutable(2));
    const untouched = instrumentSharedValue(makeWebMutable(3));

    const { result, reads } = collectSharedValueReads(() => a.value + b.value);

    expect(result).toBe(3);
    expect(reads.size).toBe(2);
    expect(reads.has(a as never)).toBe(true);
    expect(reads.has(b as never)).toBe(true);
    expect(reads.has(untouched as never)).toBe(false);
  });

  it('does not collect reads outside a collector', () => {
    const a = instrumentSharedValue(makeWebMutable(1));

    expect(a.value).toBe(1);

    const { reads } = collectSharedValueReads(() => 0);

    expect(reads.size).toBe(0);
  });

  it('keeps get/set behavior and listeners intact after instrumenting', () => {
    const a = instrumentSharedValue(makeWebMutable(1));
    const seen: number[] = [];

    a.addListener(1, (next) => seen.push(next));
    a.value = 5;

    expect(a.value).toBe(5);
    expect(seen).toEqual([5]);
  });

  it('instruments a value only once', () => {
    const raw = makeWebMutable(1);

    instrumentSharedValue(raw);
    instrumentSharedValue(raw);

    const { reads } = collectSharedValueReads(() => raw.value);

    expect(reads.size).toBe(1);
  });

  it('leaves objects without a configurable value accessor alone', () => {
    const plain = { value: 1 };

    Object.defineProperty(plain, 'value', { configurable: false, writable: true });

    expect(instrumentSharedValue(plain)).toBe(plain);

    const { reads } = collectSharedValueReads(() => plain.value);

    expect(reads.size).toBe(0);
  });

  it('restores the previous collector on nested collections', () => {
    const outer = instrumentSharedValue(makeWebMutable(1));
    const inner = instrumentSharedValue(makeWebMutable(2));

    const { reads } = collectSharedValueReads(() => {
      const nested = collectSharedValueReads(() => inner.value);

      expect(nested.reads.has(inner as never)).toBe(true);
      expect(nested.reads.has(outer as never)).toBe(false);

      return outer.value;
    });

    expect(reads.has(outer as never)).toBe(true);
    expect(reads.has(inner as never)).toBe(false);
  });

  it('hands out unique negative listener ids', () => {
    const first = nextTrackingListenerId();
    const second = nextTrackingListenerId();

    expect(first).toBeLessThan(0);
    expect(second).toBeLessThan(first);
  });
});

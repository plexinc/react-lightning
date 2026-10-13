import { describe, expect, it } from 'vitest';

import { resolveScrollToIndexTarget } from './resolveScrollToIndexTarget';

const base = {
  itemOffset: 1000,
  itemSize: 200,
  viewportSize: 1080,
  viewPosition: 0,
  viewOffset: 0,
};

describe('resolveScrollToIndexTarget', () => {
  it('holds the request while the viewport is unmeasured', () => {
    expect(resolveScrollToIndexTarget({ ...base, viewportSize: 0 })).toBeUndefined();
  });

  it('lands the item at the start', () => {
    expect(resolveScrollToIndexTarget(base)).toBe(1000);
  });

  it('centres the item with viewPosition 0.5', () => {
    expect(resolveScrollToIndexTarget({ ...base, viewPosition: 0.5 })).toBe(1000 - 440);
  });

  it('adds viewOffset', () => {
    expect(resolveScrollToIndexTarget({ ...base, viewOffset: -60 })).toBe(940);
  });
});

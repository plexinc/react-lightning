import { describe, expect, it } from 'vitest';
import dedupeArray from './dedupeArray';

describe('dedupeArray', () => {
  it('should dedupe an array', () => {
    const value = [1, 2, 3, 3, 4, 5, 5, 5, 6];
    const expected = [1, 2, 3, 4, 5, 6];
    const actual = dedupeArray(value);

    expect(actual).toEqual(expected);
  });
});

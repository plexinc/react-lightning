import { describe, expect, it } from 'vitest';

import { ellipsizeModeToTextOverflow } from './ellipsizeModeToTextOverflow';

describe('ellipsizeModeToTextOverflow', () => {
  it("maps 'clip' to clip", () => {
    expect(ellipsizeModeToTextOverflow('clip')).toBe('clip');
  });

  it("maps 'tail' to ellipsis", () => {
    expect(ellipsizeModeToTextOverflow('tail')).toBe('ellipsis');
  });

  it("falls back to ellipsis for 'head' and 'middle'", () => {
    expect(ellipsizeModeToTextOverflow('head')).toBe('ellipsis');
    expect(ellipsizeModeToTextOverflow('middle')).toBe('ellipsis');
  });

  it('returns undefined when no mode is given', () => {
    expect(ellipsizeModeToTextOverflow(undefined)).toBeUndefined();
  });
});

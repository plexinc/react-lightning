import { describe, expect, it } from 'vitest';

import { resolveContentReport } from './resolveContentReport';

describe('resolveContentReport', () => {
  const prev = { w: 0, h: 0 };

  it('holds a changed size while the list is unsettled', () => {
    expect(resolveContentReport(prev, { w: 9937, h: 40 }, false)).toBeUndefined();
  });

  it('reports the size once settled', () => {
    expect(resolveContentReport(prev, { w: 980, h: 40 }, true)).toEqual({
      w: 980,
      h: 40,
    });
  });

  it('skips an unchanged size', () => {
    expect(resolveContentReport({ w: 980, h: 40 }, { w: 980, h: 40 }, true)).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';

import { clampScrollOffset, getAxisOffset, isAxisMeasured } from './scrollOffset';

describe('isAxisMeasured', () => {
  it('needs both a viewport and content size', () => {
    expect(isAxisMeasured(1080, 3000)).toBe(true);
    expect(isAxisMeasured(0, 3000)).toBe(false);
    expect(isAxisMeasured(1080, 0)).toBe(false);
  });
});

describe('clampScrollOffset', () => {
  it('keeps the offset while unmeasured (hidden screen)', () => {
    expect(clampScrollOffset(-500, 0, 0)).toBe(-500);
    expect(clampScrollOffset(-500, 0, 3000)).toBe(-500);
  });

  it('clamps to the scrollable range once measured', () => {
    expect(clampScrollOffset(-500, 1080, 3000)).toBe(-500);
    expect(clampScrollOffset(-5000, 1080, 3000)).toBe(-1920);
    expect(clampScrollOffset(200, 1080, 3000)).toBe(0);
  });

  it('pins to 0 when the content fits', () => {
    expect(clampScrollOffset(-500, 1080, 800)).toBe(0);
    expect(Object.is(clampScrollOffset(-0, 1080, 3000), 0)).toBe(true);
  });
});

describe('getAxisOffset', () => {
  it('uses the requested position while unmeasured', () => {
    expect(getAxisOffset(0, 0, 500, 0, 'start')).toBe(-500);
    expect(getAxisOffset(0, 0, 500, 100, 'center')).toBe(-500);
  });

  it('aligns within the scrollable range once measured', () => {
    expect(getAxisOffset(1000, 3000, 500, 100, 'start')).toBe(-500);
    expect(getAxisOffset(1000, 3000, 2500, 100, 'start')).toBe(-2000);
    expect(getAxisOffset(1000, 3000, 1000, 100, 'center')).toBe(-550);
    expect(getAxisOffset(1000, 3000, 1000, 100, 'end')).toBe(-100);
  });
});

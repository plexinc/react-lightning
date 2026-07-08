import { describe, expect, it } from 'vitest';

import { capSelfMeasuredViewport } from './capSelfMeasuredViewport';

describe('capSelfMeasuredViewport', () => {
  it('returns 0 when the outer element has not measured yet', () => {
    expect(capSelfMeasuredViewport(0, 440)).toBe(0);
  });

  it('keeps the measured size when it fits within the visible span', () => {
    expect(capSelfMeasuredViewport(400, 480)).toBe(400);
  });

  it('caps a content-sized measurement at the visible span', () => {
    expect(capSelfMeasuredViewport(2400, 440)).toBe(440);
  });

  it('leaves the measured size uncapped when the visible span is unknown', () => {
    // span 0: not measured yet. span < 0: the list starts past the stage edge.
    expect(capSelfMeasuredViewport(2400, 0)).toBe(2400);
    expect(capSelfMeasuredViewport(2400, -100)).toBe(2400);
  });
});

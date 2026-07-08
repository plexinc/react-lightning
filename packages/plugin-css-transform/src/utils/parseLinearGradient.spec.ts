import { describe, expect, it } from 'vitest';

import { parseLinearGradient } from './parseLinearGradient';

describe('parseLinearGradient', () => {
  it('parses the player controls gradient (to bottom, rgba stops)', () => {
    const result = parseLinearGradient(
      'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.56) 40%, rgba(0,0,0,0.76) 60%, rgba(0,0,0,1) 100%)',
    );

    expect(result).toEqual({
      colors: [0x00000000, 0x0000008f, 0x000000c2, 0x000000ff],
      stops: [0, 0.4, 0.6, 1],
      angle: 0,
    });
  });

  it('defaults to "to bottom" (angle 0) when no direction is given', () => {
    const result = parseLinearGradient('linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)');

    expect(result?.angle).toBe(0);
  });

  it('maps "to top" to PI', () => {
    const result = parseLinearGradient('linear-gradient(to top, #000 0%, #fff 100%)');

    expect(result?.angle).toBeCloseTo(Math.PI);
  });

  it('maps a degree angle (CSS 90deg / to right)', () => {
    const result = parseLinearGradient('linear-gradient(90deg, #000, #fff)');

    // CSS 90deg -> lightning (90 - 180) deg, normalised to (3/2)PI
    expect(result?.angle).toBeCloseTo((3 * Math.PI) / 2);
  });

  it('evenly distributes stops that omit positions', () => {
    const result = parseLinearGradient('linear-gradient(to bottom, red, lime, blue)');

    expect(result?.stops).toEqual([0, 0.5, 1]);
    expect(result?.colors).toEqual([0xff0000ff, 0x00ff00ff, 0x0000ffff]);
  });

  it('interpolates a missing interior stop', () => {
    const result = parseLinearGradient(
      'linear-gradient(to bottom, #000 0%, #333, #666, #fff 100%)',
    );

    expect(result?.stops).toEqual([0, 1 / 3, 2 / 3, 1]);
  });

  it('handles rgba with spaces after commas', () => {
    const result = parseLinearGradient(
      'linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 87.5%)',
    );

    expect(result?.colors).toEqual([0x000000cc, 0x00000000]);
    expect(result?.stops).toEqual([0, 0.875]);
  });

  it('returns undefined for non-linear-gradient values', () => {
    expect(parseLinearGradient('url(foo.png)')).toBeUndefined();
    expect(parseLinearGradient('radial-gradient(#000, #fff)')).toBeUndefined();
    expect(parseLinearGradient(undefined)).toBeUndefined();
  });

  it('returns undefined when fewer than two colors resolve', () => {
    expect(parseLinearGradient('linear-gradient(#000)')).toBeUndefined();
  });
});

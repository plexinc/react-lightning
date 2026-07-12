import { describe, expect, it } from 'vitest';

import { convertCSSTransformToLightning } from './convertCSSTransformToLightning';

describe('convertCSSTransformToLightning', () => {
  it('parses a pixel translateX to a number', () => {
    expect(convertCSSTransformToLightning('translateX', 50)).toEqual({
      translateX: 50,
    });
    expect(convertCSSTransformToLightning('translateX', '50px')).toEqual({
      translateX: 50,
    });
  });

  it('preserves a percentage translate as a string (resolved at layout)', () => {
    // parseInt used to strip the % and leave 50 (px), mispositioning the node.
    expect(convertCSSTransformToLightning('translateX', '50%')).toEqual({
      translateX: '50%',
    });
    expect(convertCSSTransformToLightning('translateY', '-50%')).toEqual({
      translateY: '-50%',
    });
  });

  it('preserves percentages in the translate shorthand', () => {
    expect(convertCSSTransformToLightning('translate', '50%,10%')).toEqual({
      translateX: '50%',
      translateY: '10%',
    });
  });
});

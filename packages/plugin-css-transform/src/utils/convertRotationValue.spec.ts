import { describe, expect, it } from 'vitest';

import { convertRotationValue } from './convertRotationValue';

describe('convertRotationValue', () => {
  it('should convert degrees to radians', () => {
    expect(convertRotationValue('180deg')).toBeCloseTo(Math.PI);
    expect(convertRotationValue('90deg')).toBeCloseTo(Math.PI / 2);
  });

  it('should convert gradians to radians', () => {
    expect(convertRotationValue('200grad')).toBeCloseTo(Math.PI);
    expect(convertRotationValue('100grad')).toBeCloseTo(Math.PI / 2);
  });

  it('should handle radians directly', () => {
    expect(convertRotationValue('3.14rad')).toBeCloseTo(3.14);
    expect(convertRotationValue('1.57rad')).toBeCloseTo(1.57);
  });

  it('should convert turns to radians', () => {
    expect(convertRotationValue('1turn')).toBeCloseTo(Math.PI * 2);
    expect(convertRotationValue('0.5turn')).toBeCloseTo(Math.PI);
  });

  it('should handle numeric strings without units or with unknown units', () => {
    expect(convertRotationValue('3.14')).toBeCloseTo(3.14);
    expect(convertRotationValue('1.57')).toBeCloseTo(1.57);
    expect(convertRotationValue('5.22ish')).toBeCloseTo(5.22);
  });

  it('should return NaN for invalid inputs', () => {
    expect(convertRotationValue('invalid')).toBeNaN();
  });
});

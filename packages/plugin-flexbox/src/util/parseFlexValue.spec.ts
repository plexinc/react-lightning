import { describe, expect, it } from 'vitest';
import { parseFlexValue } from './parseFlexValue';

describe('parseFlexValue', () => {
  describe('number input', () => {
    it('should handle positive number', () => {
      const result = parseFlexValue(2);
      expect(result).toEqual({
        grow: 2,
        shrink: 1,
        basis: '0%',
      });
    });

    it('should handle zero', () => {
      const result = parseFlexValue(0);
      expect(result).toEqual({
        grow: 0,
        shrink: 1,
        basis: '0%',
      });
    });

    it('should handle decimal number', () => {
      const result = parseFlexValue(1.5);
      expect(result).toEqual({
        grow: 1.5,
        shrink: 1,
        basis: '0%',
      });
    });

    it('should default to auto basis when expandToAutoFlexBasis is true', () => {
      const result = parseFlexValue(1, true);
      expect(result).toEqual({
        grow: 1,
        shrink: 1,
        basis: 'auto',
      });
    });
  });

  describe('single value strings', () => {
    it('should handle "none" keyword', () => {
      const result = parseFlexValue('none');
      expect(result).toEqual({
        grow: 0,
        shrink: 0,
        basis: 'auto',
      });
    });

    it('should handle integer as string (flex-grow)', () => {
      const result = parseFlexValue('2');
      expect(result).toEqual({
        grow: 2,
        shrink: 1,
        basis: '0%',
      });
    });

    it('should handle decimal as string (flex-grow)', () => {
      const result = parseFlexValue('0.5');
      expect(result).toEqual({
        grow: 0.5,
        shrink: 1,
        basis: '0%',
      });
    });

    it('should handle length value as flex-basis', () => {
      const result = parseFlexValue('200px');
      expect(result).toEqual({
        grow: 1,
        shrink: 1,
        basis: '200px',
      });
    });

    it('should handle percentage value as flex-basis', () => {
      const result = parseFlexValue('50%');
      expect(result).toEqual({
        grow: 1,
        shrink: 1,
        basis: '50%',
      });
    });

    it('should handle "auto" as flex-basis', () => {
      const result = parseFlexValue('auto');
      expect(result).toEqual({
        grow: 1,
        shrink: 1,
        basis: 'auto',
      });
    });

    it('should handle "0" as flex-basis with defaults', () => {
      const result = parseFlexValue('0');
      expect(result).toEqual({
        grow: 0,
        shrink: 1,
        basis: '0%',
      });
    });
  });

  describe('two value strings', () => {
    it('should handle flex-grow and flex-shrink (both numbers)', () => {
      const result = parseFlexValue('2 3');
      expect(result).toEqual({
        grow: 2,
        shrink: 3,
        basis: 0,
      });
    });

    it('should handle flex-grow and flex-basis (number and length)', () => {
      const result = parseFlexValue('2 200px');
      expect(result).toEqual({
        grow: 2,
        shrink: 1,
        basis: '200px',
      });
    });

    it('should handle flex-grow and flex-basis (number and percentage)', () => {
      const result = parseFlexValue('1 50%');
      expect(result).toEqual({
        grow: 1,
        shrink: 1,
        basis: '50%',
      });
    });

    it('should handle flex-grow and flex-basis (number and auto)', () => {
      const result = parseFlexValue('2 auto');
      expect(result).toEqual({
        grow: 2,
        shrink: 1,
        basis: 'auto',
      });
    });

    it('should handle decimal values for grow and shrink', () => {
      const result = parseFlexValue('1.5 0.5');
      expect(result).toEqual({
        grow: 1.5,
        shrink: 0.5,
        basis: 0,
      });
    });
  });

  describe('three value strings', () => {
    it('should handle flex-grow, flex-shrink, and flex-basis (all explicit)', () => {
      const result = parseFlexValue('2 1 200px');
      expect(result).toEqual({
        grow: 2,
        shrink: 1,
        basis: '200px',
      });
    });

    it('should handle flex-grow, flex-shrink, and flex-basis with percentage', () => {
      const result = parseFlexValue('1 2 50%');
      expect(result).toEqual({
        grow: 1,
        shrink: 2,
        basis: '50%',
      });
    });

    it('should handle flex-grow, flex-shrink, and flex-basis with auto', () => {
      const result = parseFlexValue('0 1 auto');
      expect(result).toEqual({
        grow: 0,
        shrink: 1,
        basis: 'auto',
      });
    });

    it('should handle decimal values for all three', () => {
      const result = parseFlexValue('1.5 0.5 100px');
      expect(result).toEqual({
        grow: 1.5,
        shrink: 0.5,
        basis: '100px',
      });
    });

    it('should handle zero values', () => {
      const result = parseFlexValue('0 0 0');
      expect(result).toEqual({
        grow: 0,
        shrink: 0,
        basis: '0',
      });
    });
  });

  describe('common CSS flex values', () => {
    it('should handle "flex: 1" (equivalent to 1 1 0%)', () => {
      const result = parseFlexValue('1');
      expect(result).toEqual({
        grow: 1,
        shrink: 1,
        basis: '0%',
      });
    });

    it('should handle "flex: initial" would be "0 1 auto" but this returns basis as initial', () => {
      const result = parseFlexValue('initial');
      expect(result).toEqual({
        grow: 1,
        shrink: 1,
        basis: 'initial',
      });
    });

    it('should handle "flex: auto" (equivalent to 1 1 auto)', () => {
      const result = parseFlexValue('auto');
      expect(result).toEqual({
        grow: 1,
        shrink: 1,
        basis: 'auto',
      });
    });

    it('should handle "flex: none" (equivalent to 0 0 auto)', () => {
      const result = parseFlexValue('none');
      expect(result).toEqual({
        grow: 0,
        shrink: 0,
        basis: 'auto',
      });
    });
  });

  describe('edge cases and invalid values', () => {
    it('should return null for empty string', () => {
      const result = parseFlexValue('');
      expect(result).toBeNull();
    });

    it('should return null for invalid format with too many values', () => {
      const result = parseFlexValue('1 2 3 4');
      expect(result).toBeNull();
    });

    it('should handle whitespace properly', () => {
      const result = parseFlexValue('  1   2   auto  ');
      expect(result).toEqual({
        grow: 1,
        shrink: 2,
        basis: 'auto',
      });
    });

    it('should handle single space', () => {
      const result = parseFlexValue(' ');
      expect(result).toBeNull();
    });
  });

  describe('CSS spec compliance', () => {
    // Tests based on CSS Flexible Box Layout Module Level 1 specification
    // https://www.w3.org/TR/css-flexbox-1/#flex-property

    it('should handle flex: 0 (equivalent to 0 1 0%)', () => {
      const result = parseFlexValue('0');
      expect(result).toEqual({
        grow: 0,
        shrink: 1,
        basis: '0%',
      });
    });

    it('should handle negative flex-grow values (though unusual)', () => {
      const result = parseFlexValue('-1');
      expect(result).toEqual({
        grow: -1,
        shrink: 1,
        basis: '0%',
      });
    });

    it('should handle negative flex-shrink values', () => {
      const result = parseFlexValue('1 -1');
      expect(result).toEqual({
        grow: 1,
        shrink: -1,
        basis: 0,
      });
    });

    it('should handle various CSS units for flex-basis', () => {
      const testCases = [
        { input: '1 100px', expected: { grow: 1, shrink: 1, basis: '100px' } },
        { input: '1 10em', expected: { grow: 1, shrink: 1, basis: '10em' } },
        { input: '1 5rem', expected: { grow: 1, shrink: 1, basis: '5rem' } },
        { input: '1 50%', expected: { grow: 1, shrink: 1, basis: '50%' } },
        { input: '1 0', expected: { grow: 1, shrink: 1, basis: '0' } },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseFlexValue(input);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('caching behavior', () => {
    it('should cache results for string values', () => {
      // First call
      const result1 = parseFlexValue('1 2 auto');
      expect(result1).toEqual({
        grow: 1,
        shrink: 2,
        basis: 'auto',
      });

      // Second call should return cached result (same object reference)
      const result2 = parseFlexValue('1 2 auto');
      expect(result2).toBe(result1);
    });

    it('should cache results for number values', () => {
      // First call
      const result1 = parseFlexValue(2);
      expect(result1).toEqual({
        grow: 2,
        shrink: 1,
        basis: '0%',
      });

      // Second call should return cached result (same object reference)
      const result2 = parseFlexValue(2);
      expect(result2).toBe(result1);
    });

    it('should handle different inputs with different cache entries', () => {
      const result1 = parseFlexValue('1');
      const result2 = parseFlexValue('2');
      const result3 = parseFlexValue(1);

      expect(result1).not.toBe(result2);
      expect(result1).not.toBe(result3);
      expect(result2).not.toBe(result3);
    });
  });

  describe('type safety', () => {
    it('should handle string input that looks like number', () => {
      const result = parseFlexValue('42');
      expect(result).toEqual({
        grow: 42,
        shrink: 1,
        basis: '0%',
      });
    });

    it('should handle float strings', () => {
      const result = parseFlexValue('1.25');
      expect(result).toEqual({
        grow: 1.25,
        shrink: 1,
        basis: '0%',
      });
    });

    it('should handle scientific notation', () => {
      const result = parseFlexValue('1e2');
      expect(result).toEqual({
        grow: 100,
        shrink: 1,
        basis: '0%',
      });
    });
  });
});

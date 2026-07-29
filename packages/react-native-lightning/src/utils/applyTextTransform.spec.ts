import { describe, expect, it } from 'vitest';

import { applyTextTransform } from './applyTextTransform';

describe('applyTextTransform', () => {
  it('uppercases string children', () => {
    expect(applyTextTransform('abc', 'uppercase')).toBe('ABC');
  });

  it('lowercases string children', () => {
    expect(applyTextTransform('ABC', 'lowercase')).toBe('abc');
  });

  it('capitalizes the first letter of each word', () => {
    expect(applyTextTransform('hello world', 'capitalize')).toBe('Hello World');
  });

  it('leaves children unchanged for none/undefined', () => {
    expect(applyTextTransform('abc', 'none')).toBe('abc');
    expect(applyTextTransform('abc', undefined)).toBe('abc');
  });

  it('transforms each string in an array of children', () => {
    expect(applyTextTransform(['ab', 'cd'], 'uppercase')).toEqual(['AB', 'CD']);
  });

  it('leaves non-string children (numbers, elements) untouched', () => {
    expect(applyTextTransform(5, 'uppercase')).toBe(5);
  });
});

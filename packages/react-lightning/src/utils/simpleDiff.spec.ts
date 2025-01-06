import { describe, expect, it } from 'vitest';
import { simpleDiff } from './simpleDiff';

describe('simpleDiff', () => {
  it('should return null when the input objects are equal', () => {
    const obj1 = { name: 'John', age: 30 };
    const obj2 = { name: 'John', age: 30 };

    const result = simpleDiff(obj1, obj2);

    expect(result).toEqual(null);
  });

  it('should return the differences between two objects', () => {
    const obj1 = { name: 'John', age: 30 };
    const obj2 = { name: 'John', age: 35 };

    const result = simpleDiff(obj1, obj2);

    expect(result).toEqual({ age: 35 });
  });

  it('should handle nested objects', () => {
    const obj1 = { name: 'John', address: { city: 'New York', state: 'NY' } };
    const obj2 = {
      name: 'John',
      address: { city: 'Los Angeles', state: 'CA' },
    };

    const result = simpleDiff(obj1, obj2);

    expect(result).toEqual({ address: { city: 'Los Angeles', state: 'CA' } });
  });

  it('should handle arrays', () => {
    const obj1 = { name: 'John', hobbies: ['reading', 'gaming'] };
    const obj2 = { name: 'John', hobbies: ['reading', 'coding'] };

    const result = simpleDiff(obj1, obj2);

    expect(result).toEqual({ hobbies: ['reading', 'coding'] });
  });

  it('should handle circular references', () => {
    type T = { name: string; children: T[] };

    const obj1: T = { name: 'John', children: [] };
    const obj2: T = { name: 'John', children: [] };

    obj2.children.push(obj2);

    const result = simpleDiff(obj1, obj2);
    expect(result).toEqual({ children: [obj2] });
  });
});

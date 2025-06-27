import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { simpleDiff } from './simpleDiff';

describe('simpleDiff', () => {
  describe('basic functionality', () => {
    it('should return false and not mutate second object when objects are referentially equal', () => {
      const obj = { name: 'John', age: 30 };
      const second = obj;

      const result = simpleDiff(obj, second);

      expect(result).toEqual(null);
    });

    it('should return false and remove equal properties from second object', () => {
      const first = { name: 'John', age: 30 };
      const second = { name: 'John', age: 30 };

      const result = simpleDiff(first, second);

      expect(result).toEqual(null);
    });

    it('should return true and keep different properties in second object', () => {
      const first = { name: 'John', age: 30 };
      const second = { name: 'John', age: 35 };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ age: 35 });
    });

    it('should return true when second object has additional properties', () => {
      const first = { name: 'John' };
      const second = { name: 'John', age: 30 };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ age: 30 });
    });

    it('should return true when first object has properties not in second', () => {
      const first = { name: 'John', age: 30 };
      const second = { name: 'John' };

      const result = simpleDiff(first, second);

      expect(result).toEqual({});
    });
  });

  describe('primitive values', () => {
    it('should handle string values correctly', () => {
      const first = { name: 'John', city: 'NYC' };
      const second = { name: 'Jane', city: 'NYC' };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ name: 'Jane' });
    });

    it('should handle number values correctly', () => {
      const first = { age: 30, score: 100 };
      const second = { age: 35, score: 100 };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ age: 35 });
    });

    it('should handle boolean values correctly', () => {
      const first = { active: true, verified: false };
      const second = { active: false, verified: false };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ active: false });
    });

    it('should handle null and undefined values', () => {
      const first = { value: null, other: undefined };
      const second = { value: 'test', other: undefined };

      const result = simpleDiff<{ value: string | null; other: undefined }>(
        first,
        second,
      );

      expect(result).toEqual({ value: 'test' });
    });
  });

  describe('function values', () => {
    it('should compare functions by reference', () => {
      const func1 = () => 'hello';
      const func2 = () => 'hello';
      const func3 = func1;

      const first = { handler: func1 };
      const second1 = { handler: func2 };
      const second2 = { handler: func3 };

      const result1 = simpleDiff(first, second1);
      expect(result1).toEqual({ handler: func2 });

      const result2 = simpleDiff(first, second2);
      expect(result2).toEqual(null);
    });
  });

  describe('array values', () => {
    it('should handle equal arrays', () => {
      const first = { items: [1, 2, 3] };
      const second = { items: [1, 2, 3] };

      const result = simpleDiff(first, second);

      expect(result).toEqual(null);
    });

    it('should handle different arrays', () => {
      const first = { items: [1, 2, 3] };
      const second = { items: [1, 2, 4] };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ items: [1, 2, 4] });
    });

    it('should handle arrays of different lengths', () => {
      const first = { items: [1, 2] };
      const second = { items: [1, 2, 3] };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ items: [1, 2, 3] });
    });

    it('should handle nested arrays recursively', () => {
      const first = {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      };
      const second = {
        matrix: [
          [1, 2],
          [3, 5],
        ],
      };

      const result = simpleDiff(first, second);

      expect(result).toEqual({
        matrix: [
          [1, 2],
          [3, 5],
        ],
      });
    });

    it('should handle empty arrays', () => {
      const first = { items: [] };
      const second = { items: [] };

      const result = simpleDiff(first, second);

      expect(result).toEqual(null);
    });
  });

  describe('React elements', () => {
    it('should handle equal React elements', () => {
      const element1 = createElement('div', { className: 'test' });
      const element2 = createElement('div', { className: 'test' });

      const first = { component: element1 };
      const second = { component: element2 };

      const result = simpleDiff(first, second);

      expect(result).toEqual(null);
    });

    it('should handle React elements with different types', () => {
      const element1 = createElement('div', { className: 'test' });
      const element2 = createElement('span', { className: 'test' });

      const first = { component: element1 };
      const second = { component: element2 };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ component: element2 });
    });

    it('should handle React elements with different props', () => {
      const element1 = createElement('div', { className: 'test' });
      const element2 = createElement('div', { className: 'different' });

      const first = { component: element1 };
      const second = { component: element2 };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ component: element2 });
    });

    it('should handle React elements with nested props', () => {
      const element1 = createElement('div', {
        style: { color: 'red', fontSize: 12 },
      });
      const element2 = createElement('div', {
        style: { color: 'red', fontSize: 12 },
      });

      const first = { component: element1 };
      const second = { component: element2 };

      const result = simpleDiff(first, second);

      expect(result).toEqual(null);
    });
  });

  describe('object values', () => {
    it('should handle equal nested objects', () => {
      const first = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' },
      };
      const second = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' },
      };

      const result = simpleDiff(first, second);

      expect(result).toEqual(null);
    });

    it('should handle different nested objects', () => {
      const first = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' },
      };
      const second = {
        user: { name: 'Jane', age: 30 },
        settings: { theme: 'dark' },
      };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ user: { name: 'Jane', age: 30 } });
    });

    it('should handle objects with different number of properties', () => {
      const first = { a: 1, b: 2 };
      const second = { a: 1, b: 2, c: 3 };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ c: 3 });
    });

    it('should handle referentially equal nested objects', () => {
      const sharedObject = { name: 'John', age: 30 };
      const first = { user: sharedObject };
      const second = { user: sharedObject };

      const result = simpleDiff(first, second);

      expect(result).toEqual(null);
    });
  });

  describe('mixed types', () => {
    it('should handle objects with mixed property types', () => {
      const func = () => 'test';
      const element = createElement('div', { className: 'test' });

      const first = {
        name: 'John',
        age: 30,
        active: true,
        handler: func,
        items: [1, 2, 3],
        component: element,
        meta: { created: '2023-01-01' },
      };

      const second = {
        name: 'John',
        age: 35,
        active: true,
        handler: func,
        items: [1, 2, 3],
        component: element,
        meta: { created: '2023-01-01' },
      };

      const result = simpleDiff(first, second);

      expect(result).toEqual({ age: 35 });
    });

    it('should handle complex nested structures', () => {
      const first = {
        users: [
          { name: 'John', roles: ['admin', 'user'] },
          { name: 'Jane', roles: ['user'] },
        ],
        config: {
          theme: 'dark',
          features: {
            notifications: true,
            analytics: false,
          },
        },
      };

      const second = {
        users: [
          { name: 'John', roles: ['admin', 'user'] },
          { name: 'Jane', roles: ['moderator'] },
        ],
        config: {
          theme: 'light',
          features: {
            notifications: true,
            analytics: false,
          },
        },
      };

      const result = simpleDiff(first, second);

      expect(result).toEqual({
        users: [
          { name: 'John', roles: ['admin', 'user'] },
          { name: 'Jane', roles: ['moderator'] },
        ],
        config: {
          theme: 'light',
          features: {
            notifications: true,
            analytics: false,
          },
        },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const first = {};
      const second = {};

      const result = simpleDiff(first, second);

      expect(result).toEqual(null);
    });

    it('should ignore symbol keys', () => {
      const sym = Symbol('test');
      const first = { [sym]: 'value1', normal: 'same' };
      const second = { [sym]: 'value2', normal: 'same' };

      const result = simpleDiff(first, second);

      expect(result).toEqual(null);
    });

    it('should handle Date objects', () => {
      const date1 = new Date('2023-01-01');
      const date2 = new Date('2023-01-01');
      const date3 = new Date('2023-01-02');

      const first1 = { created: date1 };
      const second1 = { created: date2 };

      const first2 = { created: date1 };
      const second2 = { created: date3 };

      // Different Date instances with same time should be different (shallow comparison)
      const result1 = simpleDiff(first1, second1);
      expect(result1).toEqual(null);

      // Different dates should be different
      const result2 = simpleDiff(first2, second2);
      expect(result2).toEqual({ created: date3 });
    });

    it('should handle objects with getters/setters', () => {
      const first = {
        get computed() {
          return 'value1';
        },
        normal: 'same',
      };
      const second = {
        get computed() {
          return 'value2';
        },
        normal: 'same',
      };

      const result = simpleDiff(first, second);

      expect(result).toEqual({
        computed: 'value2',
      });
    });
  });
});

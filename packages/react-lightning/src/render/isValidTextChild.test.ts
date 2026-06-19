import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { isPrimitiveTextContent, isValidTextChild } from './isValidTextChild';

describe('isValidTextChild', () => {
  it('accepts strings, numbers and booleans', () => {
    expect(isValidTextChild('hello')).toBe(true);
    expect(isValidTextChild(42)).toBe(true);
    expect(isValidTextChild(true)).toBe(true);
  });

  it('rejects objects, arrays and elements', () => {
    expect(isValidTextChild({})).toBe(false);
    expect(isValidTextChild(['a'])).toBe(false);
    expect(isValidTextChild(createElement('span'))).toBe(false);
  });
});

describe('isPrimitiveTextContent', () => {
  it('treats empty/primitive children as flattenable here', () => {
    expect(isPrimitiveTextContent(undefined)).toBe(true);
    expect(isPrimitiveTextContent(null)).toBe(true);
    expect(isPrimitiveTextContent('hello')).toBe(true);
    expect(isPrimitiveTextContent(7)).toBe(true);
  });

  it('treats arrays of primitives (e.g. "Count: {n}") as flattenable', () => {
    expect(isPrimitiveTextContent(['Count: ', 3])).toBe(true);
    expect(isPrimitiveTextContent(['a', null, 'b'])).toBe(true);
  });

  it('defers element children to the reconciler', () => {
    // A <FormattedMessage> only becomes a translated, interpolated string once
    // React renders it — the renderer must not try to flatten it itself.
    const formattedMessage = createElement('FormattedMessage', {
      defaultMessage: 'Hello {name}',
      values: { name: 'world' },
    });

    expect(isPrimitiveTextContent(formattedMessage)).toBe(false);
    expect(isPrimitiveTextContent(['Hello ', formattedMessage])).toBe(false);
  });
});

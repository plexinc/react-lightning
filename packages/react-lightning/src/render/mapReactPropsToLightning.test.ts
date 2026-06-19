import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { LightningElementType, type LightningTextElementProps } from '../types';
import { mapReactPropsToLightning } from './mapReactPropsToLightning';

describe('mapReactPropsToLightning — text children', () => {
  const mapText = (children: unknown) =>
    mapReactPropsToLightning(LightningElementType.Text, {
      children,
    } as LightningTextElementProps) as LightningTextElementProps;

  it('uses a primitive child as the text content', () => {
    expect(mapText('hello').text).toBe('hello');
    expect(mapText(42).text).toBe('42');
  });

  it('concatenates an array of primitive children', () => {
    expect(mapText(['Count: ', 3]).text).toBe('Count: 3');
  });

  it('does not derive text from element children', () => {
    // These reach the renderer only when React could not resolve them to a
    // string. Folding them in here is what produced untranslated /
    // non-interpolated output before — the reconciler renders them instead and
    // LightningTextElement folds the result back in.
    const formattedMessage = createElement('FormattedMessage', {
      defaultMessage: 'Hello {name}',
      values: { name: 'world' },
    });

    expect(mapText(formattedMessage).text).toBeUndefined();
  });
});

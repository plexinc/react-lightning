import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  type LightningElementProps,
  LightningElementType,
  type LightningTextElementProps,
} from '../types';
import type { LightningElement } from '../types';
import { simpleDiff } from '../utils/simpleDiff';
import { createHostConfig } from './createHostConfig';
import { diffReactPropsToLightning, mapReactPropsToLightning } from './mapReactPropsToLightning';

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

describe('diffReactPropsToLightning', () => {
  const reference = (
    type: LightningElementType,
    oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>,
  ) => {
    const diff = simpleDiff(oldProps, newProps);

    if (!diff) {
      return null;
    }

    const mapped = mapReactPropsToLightning(type, diff as LightningElementProps);

    return Object.keys(mapped).length ? mapped : null;
  };

  const onFocus = () => {};
  const child = (w: number) => createElement('lng-view', { key: w, style: { w } });

  const cases: Array<[string, Record<string, unknown>, Record<string, unknown>]> = [
    ['same object', { a: 1 }, { a: 1 }],
    ['equal fresh style', { style: { w: 1, h: 2 } }, { style: { w: 1, h: 2 } }],
    ['changed style', { style: { w: 1 } }, { style: { w: 2 } }],
    ['added prop', { a: 1 }, { a: 1, b: 2 }],
    ['added undefined prop', { a: 1 }, { a: 1, b: undefined }],
    ['removed prop only', { a: 1, b: 2 }, { a: 1 }],
    ['removed and changed', { a: 1, b: 2 }, { a: 3 }],
    ['handler swapped', { onFocus }, { onFocus: () => {} }],
    ['ref and key changes', { ref: {}, key: 'a', a: 1 }, { ref: {}, key: 'b', a: 1 }],
    ['element children changed', { children: [child(1)] }, { children: [child(2)] }],
    ['string children changed', { children: 'a' }, { children: 'b' }],
    ['array children changed', { children: ['n: ', 1] }, { children: ['n: ', 2] }],
    ['children added', {}, { children: 'x' }],
    ['element child for text', { children: 'a' }, { children: child(1) }],
    ['children and style', { children: 'a', style: { w: 1 } }, { children: 'b', style: { w: 2 } }],
  ];

  for (const type of [LightningElementType.View, LightningElementType.Text]) {
    for (const [name, oldProps, newProps] of cases) {
      it(`matches simpleDiff + map for ${type}: ${name}`, () => {
        const same = name === 'same object';
        const next = same ? oldProps : newProps;

        expect(
          diffReactPropsToLightning(
            type,
            oldProps as LightningElementProps,
            next as LightningElementProps,
          ),
        ).toEqual(reference(type, oldProps, next));
      });
    }
  }

  it('keeps the key order of the new props', () => {
    const result = diffReactPropsToLightning(
      LightningElementType.Text,
      { b: 1, children: 'a', a: 1 } as unknown as LightningElementProps,
      { b: 2, children: 'b', a: 2 } as unknown as LightningElementProps,
    );

    expect(Object.keys(result ?? {})).toEqual(['b', 'text', 'a']);
  });
});

describe('commitUpdate', () => {
  const commit = (type: LightningElementType, oldProps: object, newProps: object) => {
    const setProps = vi.fn();

    createHostConfig().commitUpdate?.(
      { setProps } as unknown as LightningElement,
      type,
      oldProps as LightningElementProps,
      newProps as LightningElementProps,
      {} as never,
    );

    return setProps;
  };

  it('skips a view whose element children changed but nothing else', () => {
    const before = { children: [createElement('lng-view', { key: 1 })], style: { w: 1 } };
    const after = { children: [createElement('lng-view', { key: 2 })], style: { w: 1 } };

    expect(commit(LightningElementType.View, before, after)).not.toHaveBeenCalled();
  });

  it('stages changed text children as text', () => {
    const setProps = commit(LightningElementType.Text, { children: 'a' }, { children: 'b' });

    expect(setProps).toHaveBeenCalledExactlyOnceWith({ text: 'b' });
  });
});

import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { describe, expect, it } from 'vitest';

import type { LightningTextElementProps } from '../types';
import { LightningTextElement } from './LightningTextElement';

function createMockNode(props: Record<string, unknown> = {}) {
  return {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    alpha: 1,
    color: undefined,
    text: '',
    parent: null,
    on() {},
    off() {},
    destroy() {},
    ...props,
  };
}

const renderer = {
  createNode: (props: Record<string, unknown>) => createMockNode(props),
  createTextNode: (props: Record<string, unknown>) => createMockNode(props),
  createShader: () => ({ props: {} }),
  destroyNode: () => {},
} as unknown as RendererMain;

function createTextElement(props: Partial<LightningTextElementProps> = {}) {
  return new LightningTextElement(
    props as LightningTextElementProps,
    renderer,
    [],
    {} as Fiber,
  );
}

describe('LightningTextElement', () => {
  it('defaults to a visible color when mounted without one', () => {
    // The base transform stamps color 0 on colorless elements at mount (the
    // renderer default is white); text must stay readable, not transparent.
    const el = createTextElement({
      text: 'hello',
      style: { textAlign: 'center' },
    });

    expect(el.node.color).toBe(0xffffffff);
  });

  it('keeps an explicit style color', () => {
    const el = createTextElement({
      text: 'hello',
      style: { color: 0xff0000ff },
    });

    expect(el.node.color).toBe(0xff0000ff);
  });

  it('re-folds ancestor aggregates when a nested fragment updates', () => {
    // <Text><Text>4 </Text><Text>followers</Text></Text>: the outer node renders the combined
    // string, so a late fragment update must re-fold every aggregating ancestor.
    const outer = createTextElement({});
    const heading = createTextElement({});
    const caption = createTextElement({ text: 'followers' });
    const fragment = createTextElement({ text: '' });

    heading.insertChild(fragment);
    outer.insertChild(heading);
    outer.insertChild(caption);

    expect(outer.text).toBe('followers');

    // commitTextUpdate path: the fragment's text is set directly and the
    // host config re-folds the fragment's parent only.
    fragment.text = '4 ';
    heading.recomputeChildText();

    expect(heading.text).toBe('4 ');
    expect(outer.text).toBe('4 followers');
  });
});

import type { ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';

// The reanimated-original alias only exists in the app bundlers, and nothing here animates.
vi.mock('../animation/spring', () => ({}));
vi.mock('../utils/toLightningAnimationAndStyles', () => ({
  toLightningAnimationAndStyles: () => ({}),
}));

import { createAnimatedComponent } from './createAnimatedComponent';

type Instance = {
  props: Record<string, unknown>;
  render: () => { props: { style?: unknown } };
};

const Inner: ComponentType<{ style?: unknown }> = () => null;

const mount = (style: unknown) => {
  const Animated = createAnimatedComponent(Inner as ComponentType<Record<string, unknown>>);
  const wrapper = (
    Animated as unknown as {
      render: (
        props: unknown,
        ref: unknown,
      ) => { type: new (props: unknown) => Instance; props: object };
    }
  ).render({ style }, null);

  return new wrapper.type(wrapper.props);
};

describe('createAnimatedComponent', () => {
  it('renders the style of the props it is rendering, not the previous ones', () => {
    const instance = mount({ backgroundColor: 'card' });

    expect(instance.render().props.style).toEqual({ backgroundColor: 'card' });

    instance.props = { ...instance.props, style: { backgroundColor: 'focus' } };

    expect(instance.render().props.style).toEqual({ backgroundColor: 'focus' });
  });

  it('keeps the flattened style while the style prop is the same object', () => {
    const style = { backgroundColor: 'card' };
    const instance = mount(style);
    const first = instance.render().props.style;

    expect(instance.render().props.style).toBe(first);
  });
});

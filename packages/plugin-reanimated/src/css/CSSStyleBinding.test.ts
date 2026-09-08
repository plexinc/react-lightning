import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PARTIAL_STYLE } from '@plextv/react-lightning';
import type { FocusManager, LightningElement } from '@plextv/react-lightning';

import { CSSStyleBinding } from './CSSStyleBinding';
import { createCSSStyleParts, filterCSSStyle, finalizeCSSStyleParts } from './filterCSSStyle';
import { normalizeCSSTransition } from './normalizeCSSTransition';
import { toLightningTransition } from './toLightningTransition';
import { resetWarnOnce } from './warnOnce';

type Listener = (...args: unknown[]) => void;

class FakeElement {
  public focused = false;
  public parent: FakeElement | null = null;
  public props: { transition?: Record<string, unknown> } = {};
  public pushes: { style: Record<string, unknown>; hadTransition: boolean }[] = [];

  private readonly _listeners = new Map<string, Set<Listener>>();

  public on(event: string, listener: Listener): () => void {
    const listeners = this._listeners.get(event) ?? new Set();

    listeners.add(listener);
    this._listeners.set(event, listeners);

    return () => listeners.delete(listener);
  }

  public setProps(payload: {
    style?: Record<string, unknown>;
    transition?: Record<string, unknown>;
  }) {
    if (payload.transition) {
      this.props.transition = { ...this.props.transition, ...payload.transition };
    }

    if (payload.style) {
      this.pushes.push({ style: payload.style, hadTransition: this.props.transition != null });
    }
  }

  public setFocused(focused: boolean) {
    this.focused = focused;

    for (const listener of this._listeners.get('focusChanged') ?? []) {
      listener(this, focused);
    }
  }

  public asElement(): LightningElement {
    return this as unknown as LightningElement;
  }
}

class FakeFocusManager {
  public focusPath: LightningElement[] = [];

  private readonly _listeners = new Set<Listener>();

  public on = (_event: string, listener: Listener): (() => void) => {
    this._listeners.add(listener);

    return () => this._listeners.delete(listener);
  };

  public setPath(path: FakeElement[]) {
    this.focusPath = path.map((element) => element.asElement());

    for (const listener of this._listeners) {
      listener(this.focusPath);
    }
  }

  public asFocusManager(): FocusManager<LightningElement> {
    return this as unknown as FocusManager<LightningElement>;
  }
}

function parse(style: Record<string, unknown>) {
  const parts = finalizeCSSStyleParts(
    (() => {
      const collected = createCSSStyleParts();

      filterCSSStyle(style, collected);

      return collected;
    })(),
  );
  const transitions = parts.transitionProps ? normalizeCSSTransition(parts.transitionProps) : null;

  return { parts, transition: transitions ? toLightningTransition(transitions, parts) : null };
}

const focusStyle = {
  opacity: { default: 1, ':focus': 0.5 },
  transitionProperty: 'opacity',
  transitionDuration: 200,
};

describe('CSSStyleBinding', () => {
  beforeEach(() => {
    resetWarnOnce();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('pushes the selector value on focus and the resting value on blur', () => {
    const element = new FakeElement();
    const { parts, transition } = parse(focusStyle);
    const binding = new CSSStyleBinding(null);

    binding.setElement(element.asElement());
    binding.update(parts, transition);

    // The resting values aren't rendered, so attaching pushes them once.
    expect(element.pushes).toEqual([
      { style: expect.objectContaining({ opacity: 1 }), hadTransition: false },
    ]);

    element.setFocused(true);
    expect(element.pushes.at(-1)?.style).toMatchObject({ opacity: 0.5 });

    element.setFocused(false);
    expect(element.pushes.at(-1)?.style).toMatchObject({ opacity: 1 });
  });

  it('marks its pushes partial so unrelated props survive', () => {
    const element = new FakeElement();
    const { parts, transition } = parse(focusStyle);
    const binding = new CSSStyleBinding(null);

    binding.setElement(element.asElement());
    binding.update(parts, transition);
    element.setFocused(true);

    expect(element.pushes.at(-1)?.style[PARTIAL_STYLE as unknown as string]).toBe(true);
  });

  it('puts the transition on the element', () => {
    const element = new FakeElement();
    const { parts, transition } = parse(focusStyle);
    const binding = new CSSStyleBinding(null);

    binding.setElement(element.asElement());
    binding.update(parts, transition);

    expect(element.props.transition).toEqual({
      alpha: { duration: 200, delay: 0, easing: 'ease' },
    });
  });

  it('lands the resting values before the transition, so a focused mount does not animate in', () => {
    const element = new FakeElement();

    element.focused = true;

    const { parts, transition } = parse(focusStyle);
    const binding = new CSSStyleBinding(null);

    binding.setElement(element.asElement());
    binding.update(parts, transition);

    expect(element.pushes).toEqual([
      { style: expect.objectContaining({ opacity: 0.5 }), hadTransition: false },
    ]);
  });

  it('activates :focus-within when a descendant takes focus', () => {
    const focusManager = new FakeFocusManager();
    const element = new FakeElement();
    const child = new FakeElement();

    child.parent = element;

    const { parts, transition } = parse({
      transform: { default: [{ translateY: 0 }], ':focus-within': [{ translateY: 10 }] },
      transitionProperty: 'transform',
      transitionDuration: 200,
    });
    const binding = new CSSStyleBinding(focusManager.asFocusManager());

    binding.setElement(element.asElement());
    binding.update(parts, transition);

    focusManager.setPath([element, child]);
    expect(element.pushes.at(-1)?.style).toMatchObject({ transform: [{ translateY: 10 }] });

    focusManager.setPath([]);
    expect(element.pushes.at(-1)?.style).toMatchObject({ transform: [{ translateY: 0 }] });
  });

  it('does not push again when a re-render produces an equal value', () => {
    const element = new FakeElement();
    const binding = new CSSStyleBinding(null);
    const first = parse(focusStyle);

    binding.setElement(element.asElement());
    binding.update(first.parts, first.transition);
    element.setFocused(true);

    const pushes = element.pushes.length;
    const second = parse(focusStyle);

    binding.update(second.parts, second.transition);

    expect(element.pushes).toHaveLength(pushes);
  });

  it('stops listening once destroyed', () => {
    const element = new FakeElement();
    const { parts, transition } = parse(focusStyle);
    const binding = new CSSStyleBinding(null);

    binding.setElement(element.asElement());
    binding.update(parts, transition);
    binding.destroy();

    const pushes = element.pushes.length;

    element.setFocused(true);

    expect(element.pushes).toHaveLength(pushes);
  });
});

import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  type LightningElement,
  type LightningViewElementProps,
  LightningTextElement,
  LightningViewElement,
  PARTIAL_STYLE,
  type Plugin,
} from '@plextv/react-lightning';
import { plugin as cssPlugin } from '@plextv/react-lightning-plugin-css-transform';
import { plugin as flexboxPlugin } from '@plextv/react-lightning-plugin-flexbox';

import { cssClassNameTransformPlugin } from './cssClassNameTransformPlugin';

type Recorded = { animations: unknown[]; transforms: number };

function makeRenderer(recorded: Recorded) {
  const makeNode = (props: Record<string, unknown>) => ({
    ...props,
    on() {},
    off() {},
    emit() {},
    animate(animProps: unknown, settings: unknown) {
      recorded.animations.push({ animProps, settings });

      return { once() {}, start() {} };
    },
    destroy() {},
  });

  return {
    createNode: makeNode,
    createTextNode: makeNode,
    createShader: () => ({ props: {} }),
    createTexture: () => ({}),
    destroyNode() {},
  } as unknown as RendererMain;
}

// The react-native stack, with css-transform's fast lane optionally removed so
// every update takes the slow path through transformProps.
async function stack(
  renderer: RendererMain,
  recorded: Recorded,
  fastLane: boolean,
): Promise<Plugin<LightningElement>[]> {
  const css = cssPlugin();

  if (!fastLane) {
    delete css.transformStyle;
  }

  const counter: Plugin<LightningElement> = {
    handledStyleProps: new Set(),
    transformProps(_instance, props) {
      recorded.transforms++;

      return props;
    },
  };

  const flexbox = flexboxPlugin({ useWebWorker: false }) as Plugin<LightningElement>;

  await flexbox.init?.(renderer, null as never);

  return [cssClassNameTransformPlugin(), css, flexbox, counter];
}

const NODE_KEYS = [
  'x',
  'y',
  'w',
  'h',
  'alpha',
  'scale',
  'scaleX',
  'scaleY',
  'rotation',
  'pivot',
  'pivotX',
  'pivotY',
  'color',
  'zIndex',
  'transform',
  'opacity',
  'clipping',
  'clipRadius',
];

type Snapshot = Record<string, unknown>;

function snapshot(el: LightningViewElement, events: unknown[]): Snapshot {
  const node = el.node as unknown as Record<string, unknown>;
  const nodeProps: Record<string, unknown> = {};

  for (const key of NODE_KEYS) {
    nodeProps[key] = node[key];
  }

  const internals = el as unknown as {
    _styleTarget: object;
    _animTargets?: Map<string, unknown>;
    _flattened: boolean;
    _layoutX: number;
    _layoutY: number;
  };
  const style = el.props.style as Record<PropertyKey, unknown> | undefined;

  return {
    nodeProps,
    style: style ? { ...style, partial: style[PARTIAL_STYLE] } : style,
    styleTarget: { ...internals._styleTarget },
    animTargets: internals._animTargets ? [...internals._animTargets] : [],
    flattened: internals._flattened,
    layout: [internals._layoutX, internals._layoutY],
    visible: el.visible,
    events: [...events],
  };
}

type Step =
  | { style: Record<PropertyKey, unknown> }
  | { transition: Record<string, unknown> }
  | { setProps: Record<string, unknown> };

async function run(initial: Record<string, unknown>, steps: Step[], fastLane: boolean) {
  const recorded: Recorded = { animations: [], transforms: 0 };
  const renderer = makeRenderer(recorded);
  const el = new LightningViewElement(
    // DEV merges every payload into rawProps, which is the initial props object.
    { ...initial, style: { ...(initial.style as object) } } as unknown as LightningViewElementProps,
    renderer,
    await stack(renderer, recorded, fastLane),
    {} as Fiber,
  );
  const events: unknown[] = [];

  el.on('stylesChanged', (style) => events.push({ ...style }));
  recorded.transforms = 0;

  const snapshots: Snapshot[] = [];

  for (const step of steps) {
    if ('style' in step) {
      el.setProps({ style: { ...step.style } } as never);
    } else if ('transition' in step) {
      el.setProps({ transition: step.transition } as never);
    } else {
      el.setProps(step.setProps as never);
    }

    await Promise.resolve();
    snapshots.push(snapshot(el, events));
  }

  return { snapshots, animations: recorded.animations, transforms: recorded.transforms };
}

const partial = (style: Record<string, unknown>) => ({ ...style, [PARTIAL_STYLE]: true });

const sequences: Record<string, Step[]> = {
  'transform pushes': [
    { style: partial({ transform: [{ scale: 1.08 }] }) },
    { style: partial({ transform: [{ scale: 1 }] }) },
    { style: partial({ transform: [{ translateX: 12 }, { translateY: -4 }] }) },
    { style: partial({ transform: [{ translateX: '50%' }] }) },
    { style: partial({ transform: [{ rotate: '45deg' }, { scaleX: 2 }, { scaleY: 0.5 }] }) },
    { style: partial({ transform: [{ scale: 2 }, { scaleX: 3 }] }) },
    { style: partial({ transform: { translateX: 3, scaleY: 1.2 } }) },
    { style: partial({ transform: 'translateX(10px) scale(1.2) rotate(30deg)' }) },
    { style: partial({ transform: [{ matrix: [1, 0, 0, 1, 0, 0] }] }) },
    { style: partial({ transform: [] }) },
  ],
  'opacity pushes': [
    { style: partial({ opacity: 0 }) },
    { style: partial({ opacity: 0.5 }) },
    { style: partial({ opacity: 1 }) },
    { style: partial({ opacity: '0.4' }) },
  ],
  'lightning-shaped reanimated pushes': [
    { style: partial({ alpha: 0.5, x: 10, y: 20 }) },
    { style: partial({ scaleX: 1.1, scaleY: 1.1 }) },
    { style: partial({ transform: { translateX: 40 } }) },
    { style: partial({ alpha: 1, transform: { translateY: 8 } }) },
    { style: partial({ pivotX: 0, pivotY: 1, rotation: 0.3 }) },
  ],
  'mixed and full snapshots': [
    { style: { opacity: 0.6, transform: [{ scale: 1.05 }] } },
    { style: { opacity: 1, transform: [{ scale: 1 }], zIndex: 2 } },
    { style: partial({ opacity: 0.2, backgroundColor: '#ff0000' }) },
    { style: partial({ opacity: 0.7, transform: [{ scale: 1.2 }] }) },
    { style: partial({ alpha: 0.3, opacity: 0.9 }) },
    { style: partial({ opacity: 1, display: 'none' }) },
    { style: partial({ opacity: 1, display: 'flex' }) },
    { setProps: { style: [{ opacity: 0.5 }, { transform: [{ scale: 1.2 }] }] } },
  ],
  'with a transition': [
    { transition: { alpha: { duration: 100 }, scaleX: { duration: 100 }, x: { duration: 50 } } },
    { style: partial({ opacity: 0.5 }) },
    { style: partial({ transform: [{ scale: 1.1 }] }) },
    { style: partial({ transform: [{ scale: 1.1 }] }) },
    { style: partial({ opacity: 0.5, x: 30 }) },
    { style: partial({ opacity: 1 }) },
  ],
  'reanimated pushes that carry their transition': [
    { setProps: { transition: {}, style: partial({ transform: { translateX: 20 } }) } },
    { setProps: { transition: {}, style: partial({ opacity: 1 }) } },
    {
      setProps: {
        transition: { scaleX: { duration: 80 }, scaleY: { duration: 80 } },
        style: partial({ transform: [{ scale: 1.1 }] }),
      },
    },
  ],
  'a non-style prop next to the style': [
    { setProps: { style: partial({ opacity: 0.5 }), focusable: true } },
    { style: partial({ transform: [{ scale: 1.2 }] }) },
  ],
};

const initials: Record<string, Record<string, unknown>> = {
  plain: { style: { w: 200, h: 300 } },
  positioned: { style: { w: 200, h: 300, x: 10, y: 10, opacity: 0.8 } },
  'with className styles': { className: 'r-col', style: { w: 200, h: 300 } },
};

describe('css-transform fast lane', () => {
  beforeAll(() => {
    vi.stubGlobal('document', {
      styleSheets: [
        {
          ownerNode: { id: 'react-native-stylesheet' },
          cssRules: [{ selectorText: '.r-col', style: { cssText: 'flex-direction: column' } }],
        },
      ],
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    LightningViewElement.flattenLayoutViewsEnabled = false;
  });

  for (const [initialName, initial] of Object.entries(initials)) {
    for (const [name, steps] of Object.entries(sequences)) {
      it(`leaves the same element state as the slow path: ${name}, ${initialName}`, async () => {
        const slow = await run(initial, steps, false);
        const fast = await run(initial, steps, true);

        expect(fast.snapshots).toStrictEqual(slow.snapshots);
        expect(fast.animations).toStrictEqual(slow.animations);
      });
    }
  }

  it('matches the slow path on a flattened element', async () => {
    LightningViewElement.flattenLayoutViewsEnabled = true;

    for (const steps of Object.values(sequences)) {
      const slow = await run({ style: { w: 200, h: 300 } }, steps, false);
      const fast = await run({ style: { w: 200, h: 300 } }, steps, true);

      expect(fast.snapshots).toStrictEqual(slow.snapshots);
      expect(fast.animations).toStrictEqual(slow.animations);
    }
  });

  it('keeps lone transform and opacity pushes out of transformProps', async () => {
    const steps = [
      ...(sequences['transform pushes'] ?? []),
      ...(sequences['opacity pushes'] ?? []),
    ];

    expect((await run({ style: { w: 200, h: 300 } }, steps, false)).transforms).toBe(steps.length);
    expect((await run({ style: { w: 200, h: 300 } }, steps, true)).transforms).toBe(0);
  });

  // The slow path restamps the text default color (white) on every partial
  // push, because the pushed style carries no color.
  it('keeps a text color through an opacity push', async () => {
    const recorded: Recorded = { animations: [], transforms: 0 };
    const renderer = makeRenderer(recorded);
    const el = new LightningTextElement(
      { text: 'a', style: { color: '#ff0000' } } as never,
      renderer,
      await stack(renderer, recorded, true),
      {} as Fiber,
    );

    el.setProps({ style: partial({ opacity: 0.5 }) } as never);
    await Promise.resolve();

    expect(el.node.alpha).toBe(0.5);
    expect(el.node.color).toBe(0xff0000ff);
  });
});

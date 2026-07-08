import { beforeAll, describe, expect, it } from 'vitest';
import type { Node } from 'yoga-layout';
import { loadYoga, type Yoga } from 'yoga-layout/load';

import type { LightningViewElementStyle } from '@plextv/react-lightning';

import type { YogaOptions } from '../types/YogaOptions';
import { applyFlexPropToYoga } from './applyReactPropsToYoga';

// RN ships logical start/end insets (LTR: start=left, end=right). react-lightning
// mapped logical margins/paddings but never the position insets, so an absolutely
// positioned box pinned with `end: 0` fell back to the left edge. These pin the
// logical-inset positioning with real Yoga.

const options = { expandToAutoFlexBasis: false } as YogaOptions;

let yoga: Yoga;

beforeAll(async () => {
  yoga = await loadYoga();
});

function apply(node: Node, style: Partial<LightningViewElementStyle>): void {
  for (const key in style) {
    applyFlexPropToYoga(
      yoga,
      options,
      node,
      // oxlint-disable-next-line typescript/no-explicit-any -- test helper
      key as any,
      style[key as keyof LightningViewElementStyle],
    );
  }
}

function layoutChild(style: Partial<LightningViewElementStyle>): number {
  const parent = yoga.Node.create();
  parent.setWidth(200);
  parent.setHeight(100);

  const child = yoga.Node.create();
  child.setWidth(50);
  child.setHeight(20);
  apply(child, { position: 'absolute', ...style });
  parent.insertChild(child, 0);

  parent.calculateLayout(undefined, undefined, yoga.DIRECTION_LTR);

  return child.getComputedLeft();
}

describe('applyFlexPropToYoga logical position insets', () => {
  it('pins `end: 0` to the right edge (LTR)', () => {
    // parent 200 - child 50 - end 0 => left 150
    expect(layoutChild({ end: 0 })).toBe(150);
  });

  it('offsets `end` inward by its value', () => {
    // parent 200 - child 50 - end 20 => left 130
    expect(layoutChild({ end: 20 })).toBe(130);
  });

  it('pins `start` to the left edge plus its value (LTR)', () => {
    expect(layoutChild({ start: 30 })).toBe(30);
  });
});

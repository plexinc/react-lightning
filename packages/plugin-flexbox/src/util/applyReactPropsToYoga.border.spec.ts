import { beforeAll, describe, expect, it } from 'vitest';
import type { Node } from 'yoga-layout';
import { loadYoga, type Yoga } from 'yoga-layout/load';

import type { LightningViewElementStyle } from '@plextv/react-lightning';

import type { YogaOptions } from '../types/YogaOptions';
import { applyFlexPropToYoga } from './applyReactPropsToYoga';

// react-native feeds borderWidth into Yoga (border-box), so a border reserves
// layout space and content sits inside it. react-lightning painted the border
// but never told Yoga about it, so any component that adds a border on a state
// change (e.g. a selected tab) and compensates with `margin: -borderWidth`
// ended up shifting by the border width. These specs pin the border-box
// behaviour with real Yoga.

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

describe('applyFlexPropToYoga border', () => {
  it('reserves the border width on every edge (object form)', () => {
    const node = yoga.Node.create();

    node.setWidth(100);
    node.setHeight(40);
    apply(node, { border: { w: 10, color: 0 } });
    node.calculateLayout(undefined, undefined, yoga.DIRECTION_LTR);

    expect(node.getComputedBorder(yoga.EDGE_LEFT)).toBe(10);
    expect(node.getComputedBorder(yoga.EDGE_TOP)).toBe(10);
    expect(node.getComputedBorder(yoga.EDGE_RIGHT)).toBe(10);
    expect(node.getComputedBorder(yoga.EDGE_BOTTOM)).toBe(10);
  });

  it('reserves the border width on every edge (number form)', () => {
    const node = yoga.Node.create();

    apply(node, { border: 4 });
    node.calculateLayout(undefined, undefined, yoga.DIRECTION_LTR);

    expect(node.getComputedBorder(yoga.EDGE_LEFT)).toBe(4);
    expect(node.getComputedBorder(yoga.EDGE_BOTTOM)).toBe(4);
  });

  // The tab case: an auto-sized box gains a border on select and pulls its
  // content back out with `margin: -border`. With border-box that cancels
  // exactly, so neither the box width nor the content position moves.
  it('does not shift an auto-sized box when a -border margin compensates', () => {
    function measure(border: number) {
      const outer = yoga.Node.create();
      outer.setPadding(yoga.EDGE_HORIZONTAL, 8);
      apply(outer, { border: { w: border, color: 0 } });

      const child = yoga.Node.create();
      child.setWidth(50);
      child.setHeight(20);
      child.setMargin(yoga.EDGE_ALL, -border);
      outer.insertChild(child, 0);

      outer.calculateLayout(undefined, undefined, yoga.DIRECTION_LTR);

      return {
        width: outer.getComputedWidth(),
        childLeft: child.getComputedLeft(),
      };
    }

    const plain = measure(0);
    const bordered = measure(2);

    expect(bordered.width).toBe(plain.width);
    expect(bordered.childLeft).toBe(plain.childLeft);
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import type { Node } from 'yoga-layout';
import { loadYoga, type Yoga } from 'yoga-layout/load';

import type { LightningViewElementStyle } from '@plextv/react-lightning';

import type { ManagerNode } from '../types/ManagerNode';
import type { YogaOptions } from '../types/YogaOptions';
import applyReactPropsToYoga, { applyFlexPropToYoga } from './applyReactPropsToYoga';

// Yoga resolves `alignSelf: auto` to the parent's alignItems, and treats
// space-evenly as its own distribution. react-lightning collapsed both, so a
// child under a non-stretch parent stretched and wrapped lines lost their even
// spacing. These pin the mappings against real Yoga.

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

describe('applyFlexPropToYoga alignSelf', () => {
  // Column parent → cross axis is horizontal, so alignItems drives child width.
  function childWidthUnderFlexStartParent(childStyle: Partial<LightningViewElementStyle>): number {
    const parent = yoga.Node.create();
    parent.setWidth(200);
    parent.setHeight(100);
    parent.setAlignItems(yoga.ALIGN_FLEX_START);

    const child = yoga.Node.create();
    child.setHeight(20);
    apply(child, childStyle);
    parent.insertChild(child, 0);

    parent.calculateLayout(undefined, undefined, yoga.DIRECTION_LTR);

    return child.getComputedWidth();
  }

  it("resolves alignSelf 'auto' to the parent's alignItems, not stretch", () => {
    // flex-start parent + content-less child => width 0, not stretched to 200.
    expect(childWidthUnderFlexStartParent({ alignSelf: 'auto' })).toBe(0);
  });

  it("still honors an explicit alignSelf 'stretch'", () => {
    expect(childWidthUnderFlexStartParent({ alignSelf: 'stretch' })).toBe(200);
  });
});

describe('applyReactPropsToYoga alignSelf reset', () => {
  it('reverts to inherit (auto) when alignSelf is dropped on a later render', () => {
    const parent = yoga.Node.create();
    parent.setWidth(200);
    parent.setHeight(100);
    parent.setAlignItems(yoga.ALIGN_FLEX_START);

    const node = yoga.Node.create();
    parent.insertChild(node, 0);

    const managerNode: ManagerNode = { id: 1, node, children: [], props: {} };

    // First render stretches the child across the parent's cross axis.
    applyReactPropsToYoga(yoga, options, managerNode, { h: 20, alignSelf: 'stretch' }, true);
    parent.calculateLayout(undefined, undefined, yoga.DIRECTION_LTR);
    expect(node.getComputedWidth()).toBe(200);

    // Later render omits alignSelf → reset path must restore inherit, not stretch.
    applyReactPropsToYoga(yoga, options, managerNode, { h: 20 }, true);
    parent.calculateLayout(undefined, undefined, yoga.DIRECTION_LTR);
    expect(node.getComputedWidth()).toBe(0);
  });
});

describe('applyFlexPropToYoga alignContent', () => {
  // Two wrapped lines in a taller container: space-evenly pads the outer edges,
  // space-between does not.
  function firstLineTop(alignContent: LightningViewElementStyle['alignContent']): number {
    const parent = yoga.Node.create();
    parent.setWidth(100);
    parent.setHeight(100);
    apply(parent, { flexDirection: 'row', flexWrap: 'wrap', alignContent });

    for (let i = 0; i < 4; i++) {
      const child = yoga.Node.create();
      child.setWidth(50);
      child.setHeight(20);
      parent.insertChild(child, i);
    }

    parent.calculateLayout(undefined, undefined, yoga.DIRECTION_LTR);

    return parent.getChild(0).getComputedTop();
  }

  it("distributes wrapped lines evenly for alignContent 'space-evenly'", () => {
    // 2 lines of 20 in 100 tall => 60 free / 3 gaps = 20 top inset.
    expect(firstLineTop('space-evenly')).toBe(20);
  });

  it("keeps space-between distinct (no outer inset)", () => {
    expect(firstLineTop('space-between')).toBe(0);
  });
});

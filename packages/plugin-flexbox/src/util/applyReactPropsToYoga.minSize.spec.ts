import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadYoga, type Yoga } from 'yoga-layout/load';

import type { YogaOptions } from '../types/YogaOptions';
import { applyFlexPropToYoga } from './applyReactPropsToYoga';

const options = { expandToAutoFlexBasis: false } as YogaOptions;

let yoga: Yoga;

beforeAll(async () => {
  yoga = await loadYoga();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('applyFlexPropToYoga min size', () => {
  it.each(['minWidth', 'minHeight'] as const)('treats %s auto as unset without throwing', (key) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const node = yoga.Node.create();

    expect(applyFlexPropToYoga(yoga, options, node, key, 'auto')).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('still applies a numeric minWidth', () => {
    const parent = yoga.Node.create();
    parent.setWidth(300);
    parent.setHeight(100);
    parent.setFlexDirection(yoga.FLEX_DIRECTION_ROW);
    parent.setAlignItems(yoga.ALIGN_FLEX_START);
    const child = yoga.Node.create();
    child.setHeight(10);
    applyFlexPropToYoga(yoga, options, child, 'minWidth', 120);
    parent.insertChild(child, 0);
    parent.calculateLayout(undefined, undefined, yoga.DIRECTION_LTR);

    expect(child.getComputedWidth()).toBe(120);
  });
});

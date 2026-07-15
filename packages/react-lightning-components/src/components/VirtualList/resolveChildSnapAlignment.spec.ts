import { describe, expect, it } from 'vitest';

import type { LightningElement } from '@plextv/react-lightning';

import { resolveChildSnapTarget } from './resolveChildSnapAlignment';

function createMockElement(
  props: Record<string, unknown>,
  children: LightningElement[] = [],
): LightningElement {
  return { props, children } as unknown as LightningElement;
}

describe('resolveChildSnapTarget', () => {
  it('returns the alignment carried by the starting element', () => {
    const cell = createMockElement({ scrollSnapAlign: 'center' });

    expect(resolveChildSnapTarget(cell)).toEqual({ align: 'center' });
  });

  it('returns a pixel offset and prefers it over an alignment on the same element', () => {
    const cell = createMockElement({ scrollSnapAlign: 'center', scrollSnapOffset: 96 });

    expect(resolveChildSnapTarget(cell)).toEqual({ offset: 96 });
  });

  it('ignores non-numeric scrollSnapOffset values', () => {
    const cell = createMockElement({ scrollSnapOffset: '96' });

    expect(resolveChildSnapTarget(cell)).toBeUndefined();
  });

  it('descends first children to the row root', () => {
    const row = createMockElement({ scrollSnapAlign: 'center' });
    const flexRoot = createMockElement({}, [row]);
    const cell = createMockElement({}, [flexRoot]);

    expect(resolveChildSnapTarget(cell)).toEqual({ align: 'center' });
  });

  it('ignores rows that carry no alignment', () => {
    const row = createMockElement({});
    const cell = createMockElement({}, [createMockElement({}, [row])]);

    expect(resolveChildSnapTarget(cell)).toBeUndefined();
  });

  it('ignores values that are not valid alignments', () => {
    const row = createMockElement({ scrollSnapAlign: 'sideways' });
    const cell = createMockElement({}, [row]);

    expect(resolveChildSnapTarget(cell)).toBeUndefined();
  });

  it('stops descending past the depth cap', () => {
    let deep = createMockElement({ scrollSnapAlign: 'center' });

    for (let i = 0; i < 6; i++) {
      deep = createMockElement({}, [deep]);
    }

    expect(resolveChildSnapTarget(deep)).toBeUndefined();
  });
});

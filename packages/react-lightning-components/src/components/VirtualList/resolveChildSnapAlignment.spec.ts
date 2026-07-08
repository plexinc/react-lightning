import { describe, expect, it } from 'vitest';

import type { LightningElement } from '@plextv/react-lightning';

import { resolveChildSnapAlignment } from './resolveChildSnapAlignment';

function createMockElement(
  props: Record<string, unknown>,
  children: LightningElement[] = [],
): LightningElement {
  return { props, children } as unknown as LightningElement;
}

describe('resolveChildSnapAlignment', () => {
  it('returns the alignment carried by the starting element', () => {
    const cell = createMockElement({ scrollSnapAlign: 'center' });

    expect(resolveChildSnapAlignment(cell)).toBe('center');
  });

  it('descends first children to the row root', () => {
    const row = createMockElement({ scrollSnapAlign: 'center' });
    const flexRoot = createMockElement({}, [row]);
    const cell = createMockElement({}, [flexRoot]);

    expect(resolveChildSnapAlignment(cell)).toBe('center');
  });

  it('ignores rows that carry no alignment', () => {
    const row = createMockElement({});
    const cell = createMockElement({}, [createMockElement({}, [row])]);

    expect(resolveChildSnapAlignment(cell)).toBeUndefined();
  });

  it('ignores values that are not valid alignments', () => {
    const row = createMockElement({ scrollSnapAlign: 'sideways' });
    const cell = createMockElement({}, [row]);

    expect(resolveChildSnapAlignment(cell)).toBeUndefined();
  });

  it('stops descending past the depth cap', () => {
    let deep = createMockElement({ scrollSnapAlign: 'center' });

    for (let i = 0; i < 6; i++) {
      deep = createMockElement({}, [deep]);
    }

    expect(resolveChildSnapAlignment(deep)).toBeUndefined();
  });
});

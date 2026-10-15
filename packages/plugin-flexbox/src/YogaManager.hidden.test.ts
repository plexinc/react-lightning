import { describe, expect, it } from 'vitest';

import { YogaManager } from './YogaManager';

async function setup() {
  const m = new YogaManager();
  await m.init();
  m.addNode(1);

  const hidden = () => (m as unknown as { _hiddenElements: Set<number> })._hiddenElements.has(1);

  return { m, hidden };
}

describe('YogaManager hidden tracking', () => {
  it('follows a display key and survives pushes without one', async () => {
    const { m, hidden } = await setup();

    m.applyStyle(1, { display: 'none', w: 10 }, true);
    expect(hidden()).toBe(true);

    m.applyStyle(1, { w: 20 }, true);
    expect(hidden()).toBe(true);

    m.applyStyle(1, { display: 'flex' }, true);
    expect(hidden()).toBe(false);

    m.applyStyle(1, { w: 30 }, true, true);
    expect(hidden()).toBe(false);
  });

  it('clears when a full style drops display and resets it', async () => {
    const { m, hidden } = await setup();

    m.applyStyle(1, { display: 'none', w: 10 }, true, true);
    expect(hidden()).toBe(true);

    m.applyStyle(1, { w: 10 }, true, true);
    expect(hidden()).toBe(false);
  });

  it('keeps a null display from unhiding without a reset', async () => {
    const { m, hidden } = await setup();

    m.applyStyle(1, { display: 'none' }, true);
    m.applyStyle(1, { display: null } as never, true);
    expect(hidden()).toBe(true);

    m.applyStyle(1, { w: 5 }, true, true);
    expect(hidden()).toBe(false);
  });
});

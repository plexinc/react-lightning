import { PARTIAL_STYLE } from '@plextv/react-lightning';
import { describe, expect, it, vi } from 'vitest';

import { plugin } from './index';
import { LightningManager } from './LightningManager';

// Animated pushes (reanimated) re-enter setProps with only the keys the
// updater computed. Treating that as a full style snapshot resets every other
// flex prop in yoga — an absolutely positioned element with an animated
// marginLeft fell back into flow and pushed its siblings around.
describe('flexbox plugin transformProps partial styles', () => {
  function transform(style: Record<PropertyKey, unknown>) {
    const applyStyle = vi
      .spyOn(LightningManager.prototype, 'applyStyle')
      .mockImplementation(() => {});

    const p = plugin();

    // oxlint-disable-next-line typescript/no-explicit-any -- minimal fake element/props
    p.transformProps?.({ id: 1 } as any, { style } as any);

    const resetMissing = applyStyle.mock.calls[0]?.[3];

    applyStyle.mockRestore();

    return resetMissing;
  }

  it('resets missing flex props for a full style snapshot', () => {
    expect(transform({ marginLeft: 500 })).toBe(true);
  });

  it('keeps missing flex props for a PARTIAL_STYLE-marked style', () => {
    expect(transform({ marginLeft: 500, [PARTIAL_STYLE]: true })).toBe(false);
  });
});

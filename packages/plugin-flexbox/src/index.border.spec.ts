import { describe, expect, it, vi } from 'vitest';

import { plugin } from './index';
import { LightningManager } from './LightningManager';

// Border must reach both sides of the split: the numeric width goes to Yoga so
// it reserves the box (border-box), and the full border style stays on the
// element so the renderer still paints it. Losing either half is a regression
// (no layout reservation -> tabs jump; stripped from the renderer -> no ring).
describe('flexbox plugin transformProps border routing', () => {
  function transform(style: Record<string, unknown>) {
    const applyStyle = vi
      .spyOn(LightningManager.prototype, 'applyStyle')
      .mockImplementation(() => {});

    const p = plugin();
    // oxlint-disable-next-line typescript/no-explicit-any -- minimal fake element/props
    const result = p.transformProps?.({ id: 1 } as any, { style } as any) as any;

    const flexStyles = applyStyle.mock.calls[0]?.[1];
    applyStyle.mockRestore();

    return { flexStyles, remainingStyles: result.style };
  }

  it('sends the numeric border width to yoga and keeps the style for the renderer', () => {
    const { flexStyles, remainingStyles } = transform({
      border: { w: 2, color: 0xffffffff },
    });

    expect(flexStyles).toMatchObject({ border: 2 });
    expect(remainingStyles).toMatchObject({ border: { w: 2, color: 0xffffffff } });
  });

  it('passes a zero border through so the reservation clears on deselect', () => {
    const { flexStyles } = transform({ border: { w: 0, color: 0 } });

    expect(flexStyles).toMatchObject({ border: 0 });
  });
});

import { describe, expect, it, vi } from 'vitest';

import { clampSize } from './clampSize';
import { plugin } from './index';
import { LightningManager } from './LightningManager';

describe('clampSize', () => {
  it('caps a number at the max', () => {
    expect(clampSize(996, undefined, 820)).toBe(820);
  });

  it('raises a number to the min', () => {
    expect(clampSize(10, 50, undefined)).toBe(50);
  });

  it('leaves a size inside its bounds alone', () => {
    expect(clampSize(500, 100, 820)).toBe(500);
  });

  it('leaves percent and missing sizes alone', () => {
    expect(clampSize('50%', undefined, 820)).toBe('50%');
    expect(clampSize(undefined, undefined, 820)).toBeUndefined();
  });

  it('ignores non-numeric bounds', () => {
    expect(clampSize(996, '50%', '80%')).toBe(996);
  });
});

describe('flexbox plugin transformProps size clamp', () => {
  function transform(style: Record<string, unknown>) {
    const spy = vi.spyOn(LightningManager.prototype, 'applyStyle').mockImplementation(() => {});

    // oxlint-disable-next-line typescript/no-explicit-any -- minimal fake element/props
    const out = plugin().transformProps?.({ id: 1 } as any, { style } as any) as any;

    const flexStyle = spy.mock.calls[0]?.[1];

    spy.mockRestore();

    return { rendered: out.style, flexStyle };
  }

  it('forwards the clamped width to the renderer but the raw one to yoga', () => {
    const { rendered, flexStyle } = transform({ w: 996, h: 40, maxWidth: 820 });

    expect(rendered.w).toBe(820);
    expect(rendered.h).toBe(40);
    expect(flexStyle).toMatchObject({ w: 996, maxWidth: 820 });
  });

  it('keeps a percent width as is', () => {
    expect(transform({ w: '100%', maxWidth: 820 }).rendered.w).toBe('100%');
  });
});

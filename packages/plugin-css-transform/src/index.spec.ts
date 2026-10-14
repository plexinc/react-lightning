import { PARTIAL_STYLE } from '@plextv/react-lightning';
import { describe, expect, it } from 'vitest';

import { plugin } from './index';

describe('css transform plugin transformProps', () => {
  function transform(style: unknown) {
    // oxlint-disable-next-line typescript/no-explicit-any -- minimal fake element/props
    const result = plugin().transformProps?.({ id: 1 } as any, { style } as any) as {
      style: Record<PropertyKey, unknown>;
    };

    return result.style;
  }

  it('keeps PARTIAL_STYLE on the converted style', () => {
    const style = transform({ [PARTIAL_STYLE]: true, opacity: 1, width: 120 });

    expect(style[PARTIAL_STYLE]).toBe(true);
    expect(style.alpha).toBe(1);
  });

  it('keeps PARTIAL_STYLE on a flattened style array', () => {
    expect(transform([{ width: 1 }, { [PARTIAL_STYLE]: true, opacity: 1 }])[PARTIAL_STYLE]).toBe(
      true,
    );
  });
});

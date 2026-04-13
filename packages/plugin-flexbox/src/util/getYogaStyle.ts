import type { LightningViewElementStyle } from '@plextv/react-lightning';

import { isFlexStyleProp } from './isFlexStyleProp';

export function getYogaStyle(
  style: Partial<LightningViewElementStyle> | null = {},
): Partial<LightningViewElementStyle> {
  const yogaStyles: typeof style = {};

  for (const key in style) {
    if (isFlexStyleProp(key)) {
      const value = style[key];

      if (value != null) {
        // oxlint-disable-next-line typescript/no-explicit-any -- TODO
        (yogaStyles as any)[key] = value;
      }
    }
  }

  return yogaStyles;
}

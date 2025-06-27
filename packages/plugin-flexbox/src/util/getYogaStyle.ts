import type { LightningViewElementStyle } from '@plextv/react-lightning';
import { isFlexStyleProp } from './isFlexStyleProp';

export function getYogaStyle(
  style: Partial<LightningViewElementStyle> | null = {},
) {
  const yogaStyles: typeof style = {};

  for (const key in style) {
    if (isFlexStyleProp(key)) {
      const value = style[key];

      if (value != null) {
        // biome-ignore lint/suspicious/noExplicitAny: TODO
        (yogaStyles as any)[key] = value;
      }
    }
  }

  return yogaStyles;
}

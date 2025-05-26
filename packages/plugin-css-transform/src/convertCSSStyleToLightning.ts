import type {
  LightningElementStyle,
  LightningTextElementStyle,
} from '@plextv/react-lightning';
import type { AllStyleProps } from './types/ReactStyle';
import { flattenStyles } from './utils/flattenStyles';
import { htmlColorToLightningColor } from './utils/htmlColorToLightningColor';
import { parseTransform } from './utils/parseTransform';

export function convertCSSStyleToLightning(
  style: AllStyleProps,
): LightningElementStyle | undefined {
  if (!style) {
    return;
  }

  const {
    backgroundColor,
    color,
    border,
    borderWidth,
    borderColor,
    shadowColor,
    opacity,
    overflow,
    overflowX,
    overflowY,
    tintColor,
    fontWeight,
    transform,
    ...otherStyles
  } = flattenStyles(style);
  const finalStyle = {
    ...otherStyles,
  } as LightningElementStyle;

  if (backgroundColor != null && color == null) {
    finalStyle.color = htmlColorToLightningColor(backgroundColor);
  } else if (backgroundColor && typeof backgroundColor === 'string') {
    finalStyle.color = htmlColorToLightningColor(backgroundColor);
  } else if (color && typeof color === 'string') {
    finalStyle.color = htmlColorToLightningColor(color);
  } else if (tintColor && typeof tintColor === 'string') {
    finalStyle.color = htmlColorToLightningColor(tintColor);
  } else if (typeof color === 'number') {
    finalStyle.color = color;
  }

  if (shadowColor != null) {
    (finalStyle as LightningTextElementStyle).shadowColor =
      htmlColorToLightningColor(shadowColor);
  }

  if (border != null || borderWidth != null || borderColor != null) {
    if (typeof border === 'number') {
      finalStyle.border = {
        width: border,
        color: 0,
      };
    } else if (typeof border === 'string') {
      const [w, , c] = border.split(' ');

      finalStyle.border = {
        width: w != null ? Number.parseInt(w) : 0,
        color: htmlColorToLightningColor(c),
      };
    } else if (border) {
      finalStyle.border = border;
    } else {
      finalStyle.border = {
        width: 0,
        color: 0,
      };
    }

    if (typeof borderWidth === 'number') {
      finalStyle.border.width = borderWidth;
    }

    if (borderColor) {
      finalStyle.border.color = htmlColorToLightningColor(borderColor);
    }
  }

  if (otherStyles.display === 'none') {
    finalStyle.alpha = 0;
  } else if (opacity != null && typeof opacity === 'number') {
    finalStyle.alpha = opacity;
  } else if (otherStyles.display === 'flex') {
    finalStyle.alpha = 1;
  }

  // We don't destructure the following properties since we still want them set
  // in the final style object
  if (otherStyles.left != null) {
    finalStyle.x =
      typeof otherStyles.left === 'number'
        ? otherStyles.left
        : Number.parseInt(otherStyles.left.toString());
  }

  if (otherStyles.top != null) {
    finalStyle.y =
      typeof otherStyles.top === 'number'
        ? otherStyles.top
        : Number.parseInt(otherStyles.top);
  }

  if (fontWeight != null) {
    (finalStyle as LightningTextElementStyle).fontWeight =
      fontWeight === 'bold' || Number.parseInt(fontWeight.toString()) >= 500
        ? 'bold'
        : 'normal';
  }

  if (transform != null) {
    const { scaleX, scaleY, rotation, ...translateTransforms } =
      parseTransform(transform);

    if (scaleX != null) {
      finalStyle.scaleX = scaleX;
    }

    if (scaleY != null) {
      finalStyle.scaleY = scaleY;
    }

    if (rotation != null) {
      finalStyle.rotation = rotation;
    }

    finalStyle.transform = translateTransforms;
  }

  // Disabled for now as some components set overflow to hidden while not having their size correctly calculated
  if (
    overflow === 'hidden' ||
    overflowX === 'hidden' ||
    overflowY === 'hidden'
  ) {
    finalStyle.clipping = true;
  }

  // Drop all undefined styles
  for (const key in finalStyle) {
    if (finalStyle[key as keyof LightningElementStyle] === undefined) {
      delete finalStyle[key as keyof LightningElementStyle];
    }
  }

  return finalStyle;
}

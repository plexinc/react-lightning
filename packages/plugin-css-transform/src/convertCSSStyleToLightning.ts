import type {
  LightningElementStyle,
  LightningTextElementStyle,
} from '@plextv/react-lightning';
import type { AllStyleProps } from './types/ReactStyle';
import { flattenStyles } from './utils/flattenStyles';
import { htmlColorToLightningColor } from './utils/htmlColorToLightningColor';
import { parseLinearGradient } from './utils/parseLinearGradient';
import { parseTransform } from './utils/parseTransform';

// RN exposes per-corner radius longhands; Lightning's Rounded shader wants a single
// borderRadius (number, or [tl, tr, br, bl]). Expand the longhands so they aren't dropped.
// Logical start/end map to physical left/right (LTR only, which is all the app ships).
// Non-numeric values (animated nodes, '50%') aren't supported by the shader, so they're skipped.
interface CornerRadii {
  borderRadius?: unknown;
  borderTopLeftRadius?: unknown;
  borderTopRightRadius?: unknown;
  borderBottomLeftRadius?: unknown;
  borderBottomRightRadius?: unknown;
  borderTopStartRadius?: unknown;
  borderTopEndRadius?: unknown;
  borderBottomStartRadius?: unknown;
  borderBottomEndRadius?: unknown;
}

function resolveBorderRadius(
  radii: CornerRadii,
): number | [number, number, number, number] | undefined {
  const {
    borderRadius,
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
    borderTopStartRadius,
    borderTopEndRadius,
    borderBottomStartRadius,
    borderBottomEndRadius,
  } = radii;

  const num = (value: unknown): number | undefined =>
    typeof value === 'number' ? value : undefined;

  const topLeft = num(borderTopLeftRadius) ?? num(borderTopStartRadius);
  const topRight = num(borderTopRightRadius) ?? num(borderTopEndRadius);
  const bottomRight =
    num(borderBottomRightRadius) ?? num(borderBottomEndRadius);
  const bottomLeft =
    num(borderBottomLeftRadius) ?? num(borderBottomStartRadius);

  const base = num(borderRadius);

  if (
    topLeft == null &&
    topRight == null &&
    bottomRight == null &&
    bottomLeft == null
  ) {
    return base;
  }

  const fallback = base ?? 0;

  return [
    topLeft ?? fallback,
    topRight ?? fallback,
    bottomRight ?? fallback,
    bottomLeft ?? fallback,
  ];
}

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
    textShadowColor,
    textShadowOffset,
    textShadowRadius,
    textAlign,
    opacity,
    overflow,
    overflowX,
    overflowY,
    tintColor,
    fontWeight,
    transform,
    width,
    height,
    backgroundImage,
    experimental_backgroundImage,
    borderRadius,
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
    borderTopStartRadius,
    borderTopEndRadius,
    borderBottomStartRadius,
    borderBottomEndRadius,
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

  const gradientValue =
    typeof backgroundImage === 'string'
      ? backgroundImage
      : typeof experimental_backgroundImage === 'string'
        ? experimental_backgroundImage
        : undefined;

  if (gradientValue != null) {
    const gradient = parseLinearGradient(gradientValue);

    if (gradient) {
      finalStyle.linearGradient = gradient;
    }
  }

  // Text shadows are inert: the shipping SDF text renderer has no shadow, and
  // RN's textShadow* props were never wired to the Canvas renderer's keys. Drop
  // them instead of converting values the renderer ignores.
  if (
    shadowColor != null ||
    textShadowColor != null ||
    textShadowOffset != null ||
    textShadowRadius != null
  ) {
    console.warn(
      '[convertCSSStyleToLightning] Text shadows are not supported by the Lightning renderer; dropping shadow styles',
      { shadowColor, textShadowColor, textShadowOffset, textShadowRadius },
    );
  }

  if (border != null || borderWidth != null || borderColor != null) {
    if (typeof border === 'number') {
      finalStyle.border = {
        w: border,
        color: 0,
      };
    } else if (typeof border === 'string') {
      const [w, , c] = border.split(' ');

      finalStyle.border = {
        w: w != null ? Number.parseInt(w, 10) : 0,
        color: htmlColorToLightningColor(c) ?? 0,
      };
    } else if (border) {
      finalStyle.border = border;
    } else {
      finalStyle.border = {
        w: 0,
        color: 0,
      };
    }

    if (typeof borderWidth === 'number') {
      finalStyle.border.w = borderWidth;
    }

    if (borderColor) {
      finalStyle.border.color = htmlColorToLightningColor(borderColor) ?? 0;
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
        : Number.parseInt(otherStyles.left.toString(), 10);
  }

  if (otherStyles.top != null) {
    finalStyle.y =
      typeof otherStyles.top === 'number'
        ? otherStyles.top
        : Number.parseInt(otherStyles.top, 10);
  }

  // The renderer resolves the full 100-900 scale (and the keyword weights) to
  // the nearest font face, but only for numbers — a numeric string like '600'
  // falls through to 400. Parse those; pass numbers and keywords through as-is.
  if (fontWeight != null) {
    (finalStyle as LightningTextElementStyle).fontWeight =
      typeof fontWeight === 'number'
        ? fontWeight
        : /^\d+$/.test(fontWeight)
          ? Number.parseInt(fontWeight, 10)
          : (fontWeight as LightningTextElementStyle['fontWeight']);
  }

  if (textAlign != null) {
    // The merged style type narrows textAlign to left/center/right, but RN still
    // passes auto/justify at runtime, so widen before mapping.
    const align = textAlign as string;

    if (align === 'justify') {
      console.warn(
        '[convertCSSStyleToLightning] textAlign "justify" is not supported; using "left"',
        align,
      );
    }

    // Renderer only knows left/center/right; auto and justify both resolve left.
    (finalStyle as LightningTextElementStyle).textAlign =
      align === 'center' || align === 'right' ? align : 'left';
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

  const cornerRadii = resolveBorderRadius({
    borderRadius,
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
    borderTopStartRadius,
    borderTopEndRadius,
    borderBottomStartRadius,
    borderBottomEndRadius,
  });
  if (cornerRadii != null) {
    finalStyle.borderRadius = cornerRadii;
  }

  if (width != null) {
    finalStyle.w = width as number;
  }

  if (height != null) {
    finalStyle.h = height as number;
  }

  // Drop all undefined styles
  for (const key in finalStyle) {
    if (finalStyle[key as keyof LightningElementStyle] === undefined) {
      delete finalStyle[key as keyof LightningElementStyle];
    }
  }

  return finalStyle;
}

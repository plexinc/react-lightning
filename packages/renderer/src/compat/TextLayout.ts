import type { FontEntry, FontRegistry } from './Fonts';
import { mapTextLayout, normalizeFontMetrics } from './LightningTextLayout';

export type TextProps = {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: string;
  textAlign: string;
  verticalAlign: string;
  letterSpacing: number;
  lineHeight: number;
  maxLines: number;
  maxWidth: number;
  maxHeight: number;
  overflowSuffix: string;
  wordBreak: string;
  contain: string;
  offsetY: number;
};

export type TextLine = { text: string; width: number; x: number; y: number };

export type TextLayoutResult = {
  lines: TextLine[];
  width: number;
  height: number;
  lineHeight: number;
  /** Added to each line's y: the alphabetic baseline below the line top, or 0 for a hanging baseline. */
  baseline: number;
  /** Canvas fonts draw like Lightning's canvas renderer: hanging baseline at whole-pixel line positions. */
  hanging: boolean;
  font: string;
};

const DEFAULT_METRICS = { ascender: 800, descender: -200, lineGap: 200, unitsPerEm: 1000 };

/**
 * Lightning's own layout engine with our measurer: the SDF advances and
 * kerning for SDF fonts (what plugin-flexbox measured), canvas metrics for
 * canvas fonts, so wrapping, truncation and line positions match stock.
 */
export function layoutText(fonts: FontRegistry, p: TextProps): TextLayoutResult {
  const entry = fonts.get(p.fontFamily);
  const font = fonts.cssFont(p.fontFamily, p.fontSize, p.fontStyle);
  const metrics = normalizeFontMetrics(entry?.metrics ?? DEFAULT_METRICS, p.fontSize);
  const measure = (s: string, _family: string, letterSpacing: number) =>
    fonts.measure(entry, s, p.fontSize, letterSpacing, font);
  const [lines, , , , lineHeight, width, height] = mapTextLayout(
    measure,
    metrics,
    p.text,
    p.textAlign,
    p.fontFamily,
    p.lineHeight,
    p.overflowSuffix,
    p.wordBreak,
    p.letterSpacing,
    p.maxLines,
    p.maxWidth,
    p.maxHeight,
  );
  const hanging = !entry?.sdf && entry?.type === 'canvas';
  const out: TextLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    out.push(
      hanging
        ? { text: l[0], width: l[1], x: Math.ceil(l[3]), y: Math.ceil(l[4]) }
        : { text: l[0], width: l[1], x: l[3], y: l[4] },
    );
  }

  return {
    lines: out,
    width,
    height,
    lineHeight,
    baseline: hanging ? 0 : sdfBaseline(entry, p.fontSize, metrics.ascender),
    hanging,
    font,
  };
}

/**
 * Where the SDF renderer puts the alphabetic baseline below the line top. The
 * msdf glyph boxes carry distanceRange / 2 of padding, so the ink sits that much
 * above BMFont's `base`.
 */
export function sdfBaseline(entry: FontEntry | undefined, fontSize: number, ascender: number): number {
  const sdf = entry?.sdf;

  if (sdf && sdf.base > 0) {
    return (sdf.base - sdf.distanceRange / 2) * (fontSize / sdf.size);
  }

  return ascender;
}

export function textKey(p: TextProps): string {
  return `${p.fontFamily}|${p.fontSize}|${p.fontStyle}|${p.textAlign}|${p.letterSpacing}|${p.lineHeight}|${p.maxLines}|${p.maxWidth}|${p.maxHeight}|${p.overflowSuffix}|${p.wordBreak}|${p.text}`;
}

let rasterCanvas: HTMLCanvasElement | null = null;
let rasterCtx: CanvasRenderingContext2D | null = null;

/** Draws white glyphs into a shared canvas sized to the layout; the caller uploads it right away. */
export function rasterizeText(
  layout: TextLayoutResult,
  letterSpacing: number,
): HTMLCanvasElement | null {
  const w = Math.max(1, Math.ceil(layout.width) + 2);
  const h = Math.max(1, Math.ceil(layout.height));

  if (w > 4096 || h > 4096) {
    return null;
  }

  if (!rasterCanvas) {
    rasterCanvas = document.createElement('canvas');
    rasterCtx = rasterCanvas.getContext('2d') as CanvasRenderingContext2D;
  }

  const canvas = rasterCanvas;
  const ctx = rasterCtx as CanvasRenderingContext2D;

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  } else {
    ctx.clearRect(0, 0, w, h);
  }

  ctx.font = layout.font;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = layout.hanging ? 'hanging' : 'alphabetic';
  ctx.textAlign = 'left';

  const spacing = ctx as unknown as { letterSpacing?: string };
  const hasSpacing = 'letterSpacing' in ctx;

  if (hasSpacing) {
    spacing.letterSpacing = `${letterSpacing || 0}px`;
  }

  for (let i = 0; i < layout.lines.length; i++) {
    const line = layout.lines[i];

    if (!line.text) {
      continue;
    }

    const y = layout.baseline + line.y;
    const drawn = layout.hanging ? line.width : ctx.measureText(line.text).width;
    const diff = line.width - drawn;

    if (line.width <= 0 || (diff < 0.5 && diff > -0.5)) {
      ctx.fillText(line.text, line.x, y);
      continue;
    }

    // The TTF's hinted advances differ from the SDF advances the layout used: spread the
    // difference over the gaps so glyphs land where Lightning puts them, or squeeze as a fallback.
    const n = [...line.text].length;

    if (hasSpacing && n > 1) {
      spacing.letterSpacing = `${(letterSpacing || 0) + diff / (n - 1)}px`;
      ctx.fillText(line.text, line.x, y);
      spacing.letterSpacing = `${letterSpacing || 0}px`;
    } else {
      ctx.save();
      ctx.translate(line.x, 0);
      ctx.scale(line.width / drawn, 1);
      ctx.fillText(line.text, 0, y);
      ctx.restore();
    }
  }

  return canvas;
}

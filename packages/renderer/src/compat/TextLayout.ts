import type { FontEntry, FontRegistry } from './Fonts';

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

export type TextLine = { text: string; width: number; x: number };

export type TextLayoutResult = {
  lines: TextLine[];
  width: number;
  height: number;
  lineHeight: number;
  /** Baseline of the first line, from the top of the box. */
  baseline: number;
  font: string;
};

const SPACE = /[ ​]+/;

/**
 * Line breaking with Lightning 3's rules in mind (wrap at maxWidth on spaces,
 * split long words, suffix on the last allowed line, lineHeight <= 3 is a
 * multiplier of ascender - descender), measured with the SDF advances when
 * the font has them. Simpler than Lightning's engine: edge cases differ.
 */
export function layoutText(fonts: FontRegistry, p: TextProps): TextLayoutResult {
  const entry = fonts.get(p.fontFamily);
  const font = fonts.cssFont(p.fontFamily, p.fontSize, p.fontStyle);
  const m = entry?.metrics ?? { ascender: 800, descender: -200, lineGap: 200, unitsPerEm: 1000 };
  const scale = p.fontSize / m.unitsPerEm;
  const asc = m.ascender * scale;
  const desc = m.descender * scale;
  const bare = asc - desc;
  const lineHeight = p.lineHeight <= 3 ? p.lineHeight * bare : p.lineHeight;
  let maxLines = p.maxLines;

  if (p.maxHeight > 0) {
    const fromHeight = Math.max(1, Math.floor(p.maxHeight / lineHeight));

    if (maxLines === 0 || fromHeight < maxLines) {
      maxLines = fromHeight;
    }
  }

  const measure = (s: string) => fonts.measure(entry, s, p.fontSize, p.letterSpacing, font);
  const lines: TextLine[] =
    p.maxWidth > 0
      ? wrap(p.text, p.maxWidth, maxLines, p.overflowSuffix, measure)
      : unwrapped(p.text, maxLines, measure);
  let width = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].width > width) {
      width = lines[i].width;
    }
  }

  if (p.textAlign === 'center' || p.textAlign === 'right') {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];

      l.x = p.textAlign === 'right' ? width - l.width : (width - l.width) / 2;
    }
  }

  const base = baselineOffset(entry, p.fontSize, asc);

  return {
    lines,
    width,
    height: lines.length * lineHeight,
    lineHeight,
    baseline: (lineHeight - bare) / 2 + base,
    font,
  };
}

function baselineOffset(entry: FontEntry | undefined, fontSize: number, asc: number): number {
  const sdf = entry?.sdf;

  if (sdf && sdf.base > 0) {
    return sdf.base * (fontSize / sdf.size);
  }

  return asc;
}

function unwrapped(text: string, maxLines: number, measure: (s: string) => number): TextLine[] {
  const parts = text.split('\n');
  const n = maxLines > 0 ? Math.min(maxLines, parts.length) : parts.length;
  const out: TextLine[] = [];

  for (let i = 0; i < n; i++) {
    out.push({ text: parts[i], width: measure(parts[i]), x: 0 });
  }

  return out;
}

function wrap(
  text: string,
  maxWidth: number,
  maxLines: number,
  suffix: string,
  measure: (s: string) => number,
): TextLine[] {
  const out: TextLine[] = [];
  const limit = maxLines > 0 ? maxLines : 1000;
  const spaceW = measure(' ');
  const paragraphs = text.split('\n');

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const words = paragraphs[pi].split(SPACE);
    let line = '';
    let lineW = 0;
    let wi = 0;
    let pending = '';

    while (pending.length > 0 || wi < words.length) {
      const word = pending.length > 0 ? pending : words[wi++];

      pending = '';

      const ww = measure(word);
      const next = line ? lineW + spaceW + ww : ww;

      if (next <= maxWidth || (!line && ww <= maxWidth)) {
        line = line ? `${line} ${word}` : word;
        lineW = next;
        continue;
      }

      if (!line) {
        // A single word wider than the box: split it by characters.
        let cut = word.length - 1;

        while (cut > 1 && measure(word.slice(0, cut)) > maxWidth) {
          cut--;
        }

        if (out.length + 1 >= limit) {
          out.push(truncate(word, maxWidth, suffix, measure));

          return out;
        }

        out.push({ text: word.slice(0, cut), width: measure(word.slice(0, cut)), x: 0 });
        pending = word.slice(cut);
        continue;
      }

      if (out.length + 1 >= limit) {
        out.push(truncate(`${line} ${word}`, maxWidth, suffix, measure));

        return out;
      }

      out.push({ text: line, width: lineW, x: 0 });
      line = '';
      lineW = 0;
      pending = word;
    }

    if (out.length + 1 >= limit && pi < paragraphs.length - 1) {
      out.push(truncate(`${line} ${paragraphs.slice(pi + 1).join(' ')}`, maxWidth, suffix, measure));

      return out;
    }

    out.push({ text: line, width: lineW, x: 0 });

    if (out.length >= limit) {
      return out;
    }
  }

  return out;
}

function truncate(
  s: string,
  maxWidth: number,
  suffix: string,
  measure: (s: string) => number,
): TextLine {
  const full = measure(s);

  if (full <= maxWidth) {
    return { text: s, width: full, x: 0 };
  }

  const suffixW = measure(suffix);
  let lo = 0;
  let hi = s.length;

  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;

    if (measure(s.slice(0, mid)) + suffixW <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const head = s.slice(0, lo).trimEnd();

  return { text: head + suffix, width: measure(head) + suffixW, x: 0 };
}

export function textKey(p: TextProps): string {
  return `${p.fontFamily}|${p.fontSize}|${p.fontStyle}|${p.textAlign}|${p.letterSpacing}|${p.lineHeight}|${p.maxLines}|${p.maxWidth}|${p.maxHeight}|${p.overflowSuffix}|${p.text}`;
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
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const spacing = ctx as unknown as { letterSpacing?: string };

  if (letterSpacing && 'letterSpacing' in ctx) {
    spacing.letterSpacing = `${letterSpacing}px`;
  } else if ('letterSpacing' in ctx) {
    spacing.letterSpacing = '0px';
  }

  for (let i = 0; i < layout.lines.length; i++) {
    const line = layout.lines[i];

    if (!line.text) {
      continue;
    }

    const y = layout.baseline + i * layout.lineHeight;
    const drawn = ctx.measureText(line.text).width;

    // The canvas font's advances can run a little wider than the SDF metrics the layout used.
    if (drawn > line.width + 0.5 && line.width > 0) {
      ctx.save();
      ctx.translate(line.x, 0);
      ctx.scale(line.width / drawn, 1);
      ctx.fillText(line.text, 0, y);
      ctx.restore();
    } else {
      ctx.fillText(line.text, line.x, y);
    }
  }

  return canvas;
}

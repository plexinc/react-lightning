export type TextStyle = {
  text: string;
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  maxLines: number;
  textAlign: 'left' | 'center' | 'right';
};

export type TextLayout = {
  lines: string[];
  width: number;
  height: number;
  lineHeight: number;
};

const ELLIPSIS = '…';

/**
 * Canvas 2D text: lay out with measureText (word widths cached per font),
 * rasterize white once, tint in the shader. One shared scratch canvas.
 */
export class TextRasterizer {
  public rasterized = 0;
  private readonly _canvas: HTMLCanvasElement;
  private readonly _ctx: CanvasRenderingContext2D;
  private readonly _widths = new Map<string, Map<string, number>>();
  private readonly _layouts = new Map<string, TextLayout>();
  private _font = '';

  public constructor() {
    this._canvas = document.createElement('canvas');
    this._canvas.width = 1;
    this._canvas.height = 1;
    // GPU canvas measured 4x faster than willReadFrequently in desktop Chrome; unmeasured on TVs.
    this._ctx = must(this._canvas.getContext('2d'), '2d canvas');
  }

  public static key(s: TextStyle): string {
    return `${s.fontWeight}|${s.fontSize}|${s.fontFamily}|${s.lineHeight}|${s.maxWidth}|${s.maxLines}|${s.textAlign}|${s.text}`;
  }

  public layout(s: TextStyle, key: string): TextLayout {
    const cached = this._layouts.get(key);

    if (cached) {
      return cached;
    }

    const font = `${s.fontWeight} ${s.fontSize}px ${s.fontFamily}`;
    const lineHeight = s.lineHeight || Math.ceil(s.fontSize * 1.2);
    const widths = this._widthsFor(font);
    const space = this._measure(font, widths, ' ');
    const maxWidth = s.maxWidth > 0 ? s.maxWidth : Infinity;
    const maxLines = s.maxLines > 0 ? s.maxLines : Infinity;
    const lines: string[] = [];
    let width = 0;
    const paragraphs = s.text.split('\n');

    outer: for (let p = 0; p < paragraphs.length; p++) {
      const words = paragraphs[p].split(' ');
      let line = '';
      let lineW = 0;

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const ww = this._measure(font, widths, word);
        const next = line ? lineW + space + ww : ww;

        if (line && next > maxWidth) {
          if (lines.length + 1 >= maxLines) {
            line = this._ellipsize(font, widths, `${line} ${words.slice(i).join(' ')}`, maxWidth);
            lines.push(line);
            width = Math.max(width, Math.min(maxWidth, this._measure(font, widths, line)));
            break outer;
          }

          lines.push(line);
          width = Math.max(width, lineW);
          line = word;
          lineW = ww;
        } else {
          line = line ? `${line} ${word}` : word;
          lineW = next;
        }
      }

      if (lineW > maxWidth) {
        line = this._ellipsize(font, widths, line, maxWidth);
        lineW = maxWidth;
      }

      lines.push(line);
      width = Math.max(width, lineW);

      if (lines.length >= maxLines) {
        break;
      }
    }

    const layout = {
      lines,
      width: Math.ceil(width),
      height: lines.length * lineHeight,
      lineHeight,
    };

    if (this._layouts.size > 2000) {
      this._layouts.clear();
    }

    this._layouts.set(key, layout);

    return layout;
  }

  /** Draws into the shared canvas and returns it; the caller uploads before the next call. */
  public rasterize(s: TextStyle, layout: TextLayout): HTMLCanvasElement | null {
    const w = Math.max(1, s.maxWidth > 0 && s.textAlign !== 'left' ? s.maxWidth : layout.width);
    const h = Math.max(1, layout.height);

    if (w > 4096 || h > 4096) {
      return null;
    }

    const canvas = this._canvas;
    const ctx = this._ctx;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      this._font = '';
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    const font = `${s.fontWeight} ${s.fontSize}px ${s.fontFamily}`;

    ctx.font = font;
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = s.textAlign;
    this._font = font;

    const x = s.textAlign === 'center' ? w / 2 : s.textAlign === 'right' ? w : 0;

    for (let i = 0; i < layout.lines.length; i++) {
      ctx.fillText(layout.lines[i], x, i * layout.lineHeight + layout.lineHeight / 2);
    }

    this.rasterized++;

    return canvas;
  }

  private _widthsFor(font: string): Map<string, number> {
    let m = this._widths.get(font);

    if (!m) {
      m = new Map();
      this._widths.set(font, m);
    }

    return m;
  }

  private _measure(font: string, widths: Map<string, number>, word: string): number {
    let w = widths.get(word);

    if (w === undefined) {
      if (this._font !== font) {
        this._ctx.font = font;
        this._font = font;
      }

      w = this._ctx.measureText(word).width;

      if (widths.size > 5000) {
        widths.clear();
      }

      widths.set(word, w);
    }

    return w;
  }

  private _ellipsize(
    font: string,
    widths: Map<string, number>,
    line: string,
    maxWidth: number,
  ): string {
    if (this._measure(font, widths, line) <= maxWidth) {
      return line;
    }

    let lo = 0;
    let hi = line.length;

    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;

      if (this._measureRaw(font, line.slice(0, mid) + ELLIPSIS) <= maxWidth) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    return line.slice(0, lo).trimEnd() + ELLIPSIS;
  }

  private _measureRaw(font: string, s: string): number {
    if (this._font !== font) {
      this._ctx.font = font;
      this._font = font;
    }

    return this._ctx.measureText(s).width;
  }
}

function must<T>(v: T | null, what: string): T {
  if (v === null) {
    throw new Error(`${what} unavailable`);
  }

  return v;
}

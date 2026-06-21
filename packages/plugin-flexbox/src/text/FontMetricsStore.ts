/**
 * Synchronous msdf font metrics for the Yoga worker.
 *
 * Yoga measures text leaves during layout, on whatever thread it runs on
 * (here, a web worker). The renderer's own text measurement is async and lives
 * on the main thread, so it can't answer "how tall is this text at width W?"
 * mid-layout. This store loads the same msdf atlas JSON the renderer uses and
 * reproduces its glyph-advance maths so the worker can measure text itself.
 *
 * Width maths run in atlas *design units* (raw `xadvance`), exactly like
 * `@lightningjs/renderer`'s `SdfFontHandler.measureText`, so wrap results match
 * what the renderer will paint. Callers convert px↔design units with
 * `fontScale = fontSize / designFontSize`. See `layoutText.ts`.
 */

export interface AtlasChar {
  id: number;
  xadvance: number;
  xoffset: number;
  yoffset: number;
  width: number;
  height: number;
}

export interface AtlasKerning {
  first: number;
  second: number;
  amount: number;
}

/** OpenType-style metrics the msdf-generator embeds, in em units. */
export interface LightningMetrics {
  ascender: number;
  descender: number;
  lineGap: number;
  unitsPerEm: number;
}

export interface AtlasData {
  info: { size: number; face?: string };
  common: { lineHeight: number; base: number };
  chars: AtlasChar[];
  kernings?: AtlasKerning[];
  lightningMetrics?: LightningMetrics;
}

// Mirrors @lightningjs/renderer's TextLayoutEngine default.
const DEFAULT_METRICS: LightningMetrics = {
  ascender: 800,
  descender: -200,
  lineGap: 200,
  unitsPerEm: 1000,
};

// second glyph id → (first glyph id → kerning amount), matching the renderer's
// buildKerningTable layout for O(1) pair lookup.
type KerningTable = Map<number, Map<number, number>>;

const isZeroWidthSpace = (codepoint: number): boolean => codepoint === 0x200b;

export class FontMetrics {
  public readonly designFontSize: number;
  public readonly metrics: LightningMetrics;

  private readonly _glyphs = new Map<number, AtlasChar>();
  private readonly _kernings: KerningTable = new Map();

  public constructor(data: AtlasData) {
    this.designFontSize = data.info.size;
    this.metrics = data.lightningMetrics ?? DEFAULT_METRICS;

    for (const glyph of data.chars) {
      // BMFont `id` is the unicode codepoint; key by it for codepoint lookup.
      this._glyphs.set(glyph.id, glyph);
    }

    if (data.kernings) {
      for (const { first, second, amount } of data.kernings) {
        let firsts = this._kernings.get(second);

        if (firsts === undefined) {
          firsts = new Map();
          this._kernings.set(second, firsts);
        }

        firsts.set(first, amount);
      }
    }
  }

  public getKerning(firstGlyphId: number, secondGlyphId: number): number {
    return this._kernings.get(secondGlyphId)?.get(firstGlyphId) ?? 0;
  }

  /**
   * Width of `text` in atlas design units (port of
   * `SdfFontHandler.measureText`). `letterSpacing` is also in design units.
   */
  public measureText(text: string, letterSpacing: number): number {
    if (text.length === 0) {
      return 0;
    }

    let width = 0;
    let prevGlyphId = 0;

    for (const char of text) {
      const codepoint = char.codePointAt(0);

      if (codepoint === undefined || isZeroWidthSpace(codepoint)) {
        continue;
      }

      const glyph = this._glyphs.get(codepoint);

      if (glyph === undefined) {
        continue;
      }

      let advance = glyph.xadvance;

      if (prevGlyphId !== 0) {
        advance += this.getKerning(prevGlyphId, glyph.id);
      }

      width += advance + letterSpacing;
      prevGlyphId = glyph.id;
    }

    return width;
  }
}

/** Loads and caches one `FontMetrics` per font family from its atlas JSON URL. */
export class FontMetricsStore {
  private readonly _fonts = new Map<string, FontMetrics>();
  private readonly _loading = new Map<string, Promise<void>>();

  public has(fontFamily: string): boolean {
    return this._fonts.has(fontFamily);
  }

  public get(fontFamily: string): FontMetrics | undefined {
    return this._fonts.get(fontFamily);
  }

  public register(fontFamily: string, data: AtlasData): void {
    this._fonts.set(fontFamily, new FontMetrics(data));
  }

  /** Fetch + register an atlas JSON. Deduplicated per family; never throws. */
  public async load(fontFamily: string, atlasDataUrl: string): Promise<void> {
    if (this._fonts.has(fontFamily)) {
      return;
    }

    let pending = this._loading.get(fontFamily);

    if (pending === undefined) {
      pending = (async () => {
        try {
          const response = await fetch(atlasDataUrl);
          const data = (await response.json()) as AtlasData;
          this.register(fontFamily, data);
        } catch (error) {
          // A missing/late font just means text stays unmeasured (single-line
          // fallback) until it loads — not a layout-fatal error.
          console.warn(`[flexbox] failed to load font metrics for ${fontFamily}`, error);
        } finally {
          this._loading.delete(fontFamily);
        }
      })();

      this._loading.set(fontFamily, pending);
    }

    return pending;
  }
}

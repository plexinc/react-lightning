export type FontMetrics = {
  ascender: number;
  descender: number;
  lineGap: number;
  unitsPerEm: number;
};

type SdfData = {
  size: number;
  base: number;
  advances: Map<number, number>;
  kernings: Map<number, number>;
  fallback: number;
};

export type FontEntry = {
  family: string;
  type: 'sdf' | 'canvas';
  metrics: FontMetrics;
  sdf: SdfData | null;
  loaded: boolean;
  /** CSS family name the canvas draws with (the original font file, not the msdf atlas). */
  cssFamily: string;
};

const DEFAULT_METRICS: FontMetrics = {
  ascender: 800,
  descender: -200,
  lineGap: 200,
  unitsPerEm: 1000,
};

type FontOptions = {
  fontFamily: string;
  atlasUrl?: string;
  atlasDataUrl?: string;
  fontUrl?: string;
  metrics?: FontMetrics;
};

/**
 * Loads the app's fonts for canvas rasterizing. SDF fonts keep their msdf
 * JSON advances and kerning so line breaking matches what plugin-flexbox
 * measured (it mirrors Lightning's SDF layout), while glyphs are drawn by the
 * canvas from the original font file next to the atlas.
 */
export class FontRegistry {
  public readonly fonts = new Map<string, FontEntry>();
  private readonly _waiters = new Map<string, (() => void)[]>();
  private readonly _ctx: CanvasRenderingContext2D;
  private readonly _canvasWidths = new Map<string, Map<string, number>>();
  private _ctxFont = '';

  public constructor() {
    const c = document.createElement('canvas');

    c.width = 1;
    c.height = 1;
    this._ctx = c.getContext('2d') as CanvasRenderingContext2D;
  }

  public load(type: string, opts: FontOptions): void {
    const family = opts.fontFamily;
    const entry: FontEntry = {
      family,
      type: type === 'sdf' ? 'sdf' : 'canvas',
      metrics: opts.metrics ?? DEFAULT_METRICS,
      sdf: null,
      loaded: false,
      cssFamily: `compat-${family}`,
    };

    this.fonts.set(family, entry);

    const fileUrl =
      type === 'sdf' && opts.atlasUrl
        ? opts.atlasUrl.replace(/\.msdf\.png$/, '.ttf')
        : (opts.fontUrl ?? null);
    const jobs: Promise<unknown>[] = [];

    if (fileUrl && typeof FontFace === 'function') {
      const face = new FontFace(entry.cssFamily, `url(${JSON.stringify(fileUrl)})`);

      jobs.push(
        face.load().then(
          (f) => {
            document.fonts.add(f);
          },
          (e) => console.warn(`[compat] font file failed for ${family}`, e),
        ),
      );
    }

    if (type === 'sdf' && opts.atlasDataUrl) {
      jobs.push(
        fetch(opts.atlasDataUrl)
          .then((r) => r.json())
          .then((json) => {
            entry.sdf = parseSdf(json);
          })
          .catch((e) => console.warn(`[compat] atlas data failed for ${family}`, e)),
      );
    }

    void Promise.all(jobs).then(() => {
      entry.loaded = true;
      this._ctxFont = '';

      const waiters = this._waiters.get(family);

      this._waiters.delete(family);
      waiters?.forEach((fn) => fn());
    });
  }

  public get(family: string): FontEntry | undefined {
    return this.fonts.get(family);
  }

  /** Returns true when ready; otherwise calls `fn` once it is. */
  public whenLoaded(family: string, fn: () => void): boolean {
    const entry = this.fonts.get(family);

    if (!entry || entry.loaded) {
      return true;
    }

    let list = this._waiters.get(family);

    if (!list) {
      list = [];
      this._waiters.set(family, list);
    }

    list.push(fn);

    return false;
  }

  public cssFont(family: string, fontSize: number, fontStyle: string): string {
    const entry = this.fonts.get(family);
    const css = entry ? `"${entry.cssFamily}"` : family;

    return `${fontStyle === 'italic' ? 'italic ' : ''}${fontSize}px ${css}`;
  }

  /** Width in pixels, the way Lightning's SDF handler measures (advance + kerning + letterSpacing per glyph). */
  public measure(
    entry: FontEntry | undefined,
    text: string,
    fontSize: number,
    letterSpacing: number,
    font: string,
  ): number {
    if (text.length === 0) {
      return 0;
    }

    const sdf = entry?.sdf;

    if (sdf) {
      const scale = fontSize / sdf.size;
      let width = 0;
      let prev = 0;

      for (const ch of text) {
        const cp = ch.codePointAt(0) as number;

        if (cp === 0x200b) {
          continue;
        }

        let adv = sdf.advances.get(cp);
        let id = cp;

        if (adv === undefined) {
          adv = sdf.fallback;
          id = 63;
        }

        if (prev !== 0) {
          adv += sdf.kernings.get(prev * 65536 + id) ?? 0;
        }

        width += adv * scale + letterSpacing;
        prev = id;
      }

      return width;
    }

    let cache = this._canvasWidths.get(font);

    if (!cache) {
      cache = new Map();
      this._canvasWidths.set(font, cache);
    }

    let w = cache.get(text);

    if (w === undefined) {
      if (this._ctxFont !== font) {
        this._ctx.font = font;
        this._ctxFont = font;
      }

      w = this._ctx.measureText(text).width;

      if (cache.size > 4000) {
        cache.clear();
      }

      cache.set(text, w);
    }

    return w + letterSpacing * [...text].length;
  }
}

type SdfJson = {
  info?: { size?: number };
  common?: { base?: number; lineHeight?: number };
  chars?: { id: number; xadvance: number }[];
  kernings?: { first: number; second: number; amount: number }[];
};

function parseSdf(json: SdfJson): SdfData {
  const advances = new Map<number, number>();

  for (const c of json.chars ?? []) {
    advances.set(c.id, c.xadvance);
  }

  const kernings = new Map<number, number>();

  for (const k of json.kernings ?? []) {
    kernings.set(k.first * 65536 + k.second, k.amount);
  }

  return {
    size: json.info?.size ?? 42,
    base: json.common?.base ?? 0,
    advances,
    kernings,
    fallback: advances.get(63) ?? advances.get(32) ?? 0,
  };
}

import { TEX_READY, Texture } from './TextureManager';

// `hw` is the furthest x ever handed out: anything left of it may hold an old string.
type Shelf = { y: number; h: number; x: number; hw: number; free: number[] };

/** `dirty` when the slot held a string before and needs clearing. */
export type Slot = { shelf: number; x: number; y: number; w: number; h: number; dirty: boolean };

/**
 * Shelf packing with shelves rounded to 8 px heights, so lines of the same
 * font size share a shelf and a short label doesn't open a tall one. Freed
 * slots go back to their shelf and are reused by anything narrower.
 */
export class ShelfPacker {
  public readonly width: number;
  public readonly height: number;
  private readonly _shelves: Shelf[] = [];
  private _bottom = 0;

  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /** Fills `out` with a free w x h slot (h is the shelf's height); false when nothing fits. */
  public alloc(w: number, h: number, out: Slot): boolean {
    if (w > this.width || h > this.height) {
      return false;
    }

    const shelves = this._shelves;
    let best = -1;
    let bestFree = -1;

    for (let i = 0; i < shelves.length; i++) {
      const s = shelves[i];

      if (s.h < h || s.h - h >= 8 || (best >= 0 && s.h > shelves[best].h)) {
        continue;
      }

      // Free list: [x, w] pairs; take the narrowest slot that fits.
      let fit = -1;

      for (let k = 0; k < s.free.length; k += 2) {
        if (s.free[k + 1] >= w && (fit < 0 || s.free[k + 1] < s.free[fit + 1])) {
          fit = k;
        }
      }

      if (fit >= 0 || s.x + w <= this.width) {
        best = i;
        bestFree = fit;
      }
    }

    if (best < 0) {
      const sh = Math.ceil(h / 8) * 8;

      if (this._bottom + sh > this.height) {
        return false;
      }

      shelves.push({ y: this._bottom, h: sh, x: 0, hw: 0, free: [] });
      this._bottom += sh;
      best = shelves.length - 1;
    }

    const s = shelves[best];

    out.shelf = best;
    out.y = s.y;
    out.h = s.h;

    if (bestFree >= 0) {
      const x = s.free[bestFree];
      const fw = s.free[bestFree + 1];

      out.x = x;
      out.dirty = true;

      if (fw - w >= 4) {
        s.free[bestFree] = x + w;
        s.free[bestFree + 1] = fw - w;
        out.w = w;
      } else {
        s.free.splice(bestFree, 2);
        out.w = fw;
      }

      return true;
    }

    out.x = s.x;
    out.w = w;
    out.dirty = s.x < s.hw;
    s.x += w;

    if (s.x > s.hw) {
      s.hw = s.x;
    }

    return true;
  }

  /** Gives a slot back, with the `w` that `alloc` wrote. */
  public free(shelf: number, x: number, w: number): void {
    const s = this._shelves[shelf];

    if (!s) {
      return;
    }

    if (x + w === s.x) {
      s.x = x;

      // Pull the end back over free slots that now touch it.
      for (let k = 0; k < s.free.length; ) {
        if (s.free[k] + s.free[k + 1] === s.x) {
          s.x = s.free[k];
          s.free.splice(k, 2);
          k = 0;
        } else {
          k += 2;
        }
      }

      return;
    }

    s.free.push(x, w);
  }

  public reset(): void {
    this._shelves.length = 0;
    this._bottom = 0;
  }
}

export type TextEntry = {
  key: string;
  tex: Texture;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  w: number;
  h: number;
  refCount: number;
  /** Page index, or -1 for a texture of its own (too big for a page, or every page pinned). */
  page: number;
  shelf: number;
  sx: number;
  sw: number;
};

type Page = { tex: Texture; packer: ShelfPacker };

export type TextAtlasOptions = {
  pageSize?: number;
  maxPages?: number;
};

const PAD = 1;

/**
 * Text rasters share a couple of RGBA pages instead of one texture per string,
 * so a new string is a texSubImage2D into an existing texture and all the text
 * in a frame binds one or two texture units. Unreferenced strings stay cached
 * until their space is needed, then the least recently released go first.
 */
export class TextAtlas {
  public bytes = 0;
  public uploads = 0;
  /** Strings that got a texture of their own. */
  public standalone = 0;
  public evictions = 0;

  private readonly _gl: WebGLRenderingContext;
  private readonly _size: number;
  private readonly _maxPages: number;
  private readonly _pages: Page[] = [];
  private readonly _entries = new Map<string, TextEntry>();
  // Unreferenced entries, least recently released first.
  private readonly _lru = new Map<TextEntry, true>();
  private readonly _slot: Slot = { shelf: 0, x: 0, y: 0, w: 0, h: 0, dirty: false };
  private _zeros: Uint8Array | null = null;

  public constructor(gl: WebGLRenderingContext, opts: TextAtlasOptions = {}) {
    this._gl = gl;
    this._size = Math.min(opts.pageSize ?? 1024, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);
    this._maxPages = opts.maxPages ?? 2;
  }

  /** The entry for `key`, rasterizing with `draw` on a miss; null when the canvas couldn't be drawn. */
  public acquire(key: string, draw: () => HTMLCanvasElement | null): TextEntry | null {
    const hit = this._entries.get(key);

    if (hit) {
      if (hit.refCount === 0) {
        this._lru.delete(hit);
      }

      hit.refCount++;

      return hit;
    }

    const canvas = draw();

    if (!canvas) {
      return null;
    }

    const w = canvas.width;
    const h = canvas.height;
    const gl = this._gl;
    const page = this._place(w + 2 * PAD, h + 2 * PAD);
    let entry: TextEntry;

    if (page < 0) {
      const tex = new Texture(key);

      tex.glTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      params(gl);
      tex.w = w;
      tex.h = h;
      tex.bytes = w * h * 4;
      tex.state = TEX_READY;
      this.bytes += tex.bytes;
      this.standalone++;
      entry = { key, tex, u0: 0, v0: 0, u1: 1, v1: 1, w, h, refCount: 1, page: -1, shelf: 0, sx: 0, sw: 0 };
    } else {
      const p = this._pages[page];
      const slot = this._slot;
      const size = this._size;
      const x = slot.x + PAD;
      const y = slot.y + PAD;

      gl.bindTexture(gl.TEXTURE_2D, p.tex.glTexture);
      if (slot.dirty) {
        // A reused slot still holds its last string; clear it so the padding stays transparent.
        gl.texSubImage2D(gl.TEXTURE_2D, 0, slot.x, slot.y, slot.w, slot.h, gl.RGBA, gl.UNSIGNED_BYTE, this._zeroes(slot.w * slot.h * 4));
      }

      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      entry = {
        key,
        tex: p.tex,
        u0: x / size,
        v0: y / size,
        u1: (x + w) / size,
        v1: (y + h) / size,
        w,
        h,
        refCount: 1,
        page,
        shelf: slot.shelf,
        sx: slot.x,
        sw: slot.w,
      };
    }

    this.uploads++;
    this._entries.set(key, entry);

    return entry;
  }

  public release(entry: TextEntry): void {
    entry.refCount--;

    if (entry.refCount > 0) {
      return;
    }

    if (entry.page < 0) {
      this._entries.delete(entry.key);
      this._gl.deleteTexture(entry.tex.glTexture);
      entry.tex.glTexture = null;
      this.bytes -= entry.tex.bytes;

      return;
    }

    this._lru.set(entry, true);
  }

  public get pageCount(): number {
    return this._pages.length;
  }

  private _place(w: number, h: number): number {
    const slot = this._slot;
    const pages = this._pages;

    if (w > this._size || h > this._size / 4) {
      return -1;
    }

    for (let i = 0; i < pages.length; i++) {
      if (pages[i].packer.alloc(w, h, slot)) {
        return i;
      }
    }

    if (pages.length < this._maxPages) {
      pages.push(this._newPage());

      return pages[pages.length - 1].packer.alloc(w, h, slot) ? pages.length - 1 : -1;
    }

    for (const old of this._lru.keys()) {
      this._lru.delete(old);
      this._entries.delete(old.key);
      this.evictions++;

      const p = pages[old.page];

      p.packer.free(old.shelf, old.sx, old.sw);

      if (p.packer.alloc(w, h, slot)) {
        return old.page;
      }
    }

    return -1;
  }

  private _newPage(): Page {
    const gl = this._gl;
    const tex = new Texture(`__text-atlas-${this._pages.length}`);

    tex.w = this._size;
    tex.h = this._size;
    tex.bytes = this._size * this._size * 4;
    tex.state = TEX_READY;
    tex.refCount = 1;
    tex.glTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this._size, this._size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    params(gl);
    this.bytes += tex.bytes;

    return { tex, packer: new ShelfPacker(this._size, this._size) };
  }

  private _zeroes(n: number): Uint8Array {
    if (!this._zeros || this._zeros.length < n) {
      this._zeros = new Uint8Array(Math.max(n, 64 * 1024));
    }

    return this._zeros.length === n ? this._zeros : this._zeros.subarray(0, n);
  }
}

function params(gl: WebGLRenderingContext): void {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

export const TEX_LOADING = 0;
export const TEX_PENDING_UPLOAD = 1;
export const TEX_READY = 2;
export const TEX_FAILED = 3;

type Source = TexImageSource;

export class Texture {
  public key: string;
  public state = TEX_LOADING;
  public glTexture: WebGLTexture | null = null;
  public w = 0;
  public h = 0;
  public bytes = 0;
  public refCount = 0;
  public source: Source | null = null;
  public waiters: (() => void)[] | null = null;

  public constructor(key: string) {
    this.key = key;
  }
}

export type TextureManagerOptions = {
  /** Bytes of GPU memory kept for unreferenced textures before evicting. */
  memoryCap?: number;
  /** Max texImage2D calls per frame, so a burst of loads can't stall one frame. */
  uploadsPerFrame?: number;
};

const hasCreateImageBitmap = typeof createImageBitmap === 'function' && typeof fetch === 'function';

/**
 * Image and canvas textures with refcounting and an LRU of unreferenced ones.
 * Decode happens off the main thread where the platform allows it
 * (createImageBitmap, or HTMLImageElement.decode), otherwise inside texImage2D.
 */
export class TextureManager {
  public uploadsThisFrame = 0;
  public totalUploads = 0;
  public memoryUsed = 0;
  /** performance.now() of the first image request and the last image upload, for benchmarks. */
  public firstLoadAt = 0;
  public lastUploadAt = 0;

  private readonly _gl: WebGLRenderingContext;
  private readonly _cache = new Map<string, Texture>();
  // Unreferenced textures in least-recently-released order (Map keeps insertion order).
  private readonly _lru = new Map<Texture, true>();
  private _queue: Texture[] = [];
  private readonly _memoryCap: number;
  private readonly _uploadsPerFrame: number;
  private _onReady: () => void;
  private _bitmapOk = hasCreateImageBitmap;

  public readonly white: Texture;

  public constructor(
    gl: WebGLRenderingContext,
    onReady: () => void,
    opts: TextureManagerOptions = {},
  ) {
    this._gl = gl;
    this._onReady = onReady;
    this._memoryCap = opts.memoryCap ?? 64 * 1024 * 1024;
    this._uploadsPerFrame = opts.uploadsPerFrame ?? 8;

    this.white = new Texture('__white');
    this.white.refCount = 1;
    this._createWhite();
  }

  /**
   * After a context restore every GL texture is gone: drop what was uploaded
   * (callers have released their references and acquire again), keep loads
   * still in flight so they upload into the new context.
   */
  public restore(): void {
    for (const [key, tex] of this._cache) {
      if (tex.state === TEX_LOADING || tex.state === TEX_PENDING_UPLOAD) {
        continue;
      }

      this._cache.delete(key);
      this._lru.delete(tex);
      tex.glTexture = null;
      tex.state = TEX_FAILED;
    }

    this.memoryUsed = 0;
    this._createWhite();
  }

  private _createWhite(): void {
    const gl = this._gl;

    this.white.glTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.white.glTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );
    setParams(gl);
    this.white.w = 1;
    this.white.h = 1;
    this.white.state = TEX_READY;
  }

  public acquireImage(src: string): Texture {
    let tex = this._cache.get(src);

    if (tex) {
      this._retain(tex);

      return tex;
    }

    tex = new Texture(src);
    tex.refCount = 1;
    this._cache.set(src, tex);
    this._load(tex, src);

    return tex;
  }

  /** Synchronous upload of a canvas the caller owns (text). Counts against nothing. */
  public acquireCanvas(key: string, draw: () => HTMLCanvasElement | null): Texture {
    let tex = this._cache.get(key);

    if (tex) {
      this._retain(tex);

      return tex;
    }

    tex = new Texture(key);
    tex.refCount = 1;
    this._cache.set(key, tex);

    const canvas = draw();

    if (!canvas) {
      tex.state = TEX_FAILED;

      return tex;
    }

    this._upload(tex, canvas);

    return tex;
  }

  public release(tex: Texture): void {
    if (tex === this.white) {
      return;
    }

    tex.refCount--;

    if (tex.refCount <= 0) {
      tex.refCount = 0;
      this._lru.set(tex, true);
      this._evict();
    }
  }

  public whenReady(tex: Texture, fn: () => void): void {
    if (tex.state === TEX_READY || tex.state === TEX_FAILED) {
      fn();

      return;
    }

    (tex.waiters ??= []).push(fn);
  }

  /** Called once per frame before drawing. */
  public processUploads(): void {
    this.uploadsThisFrame = 0;

    if (this._queue.length === 0) {
      return;
    }

    const queue = this._queue;
    let i = 0;

    for (; i < queue.length && i < this._uploadsPerFrame; i++) {
      const tex = queue[i];

      if (tex.source && tex.state === TEX_PENDING_UPLOAD) {
        this._upload(tex, tex.source);
        this.lastUploadAt = performance.now();
      }
    }

    this._queue = i >= queue.length ? [] : queue.slice(i);

    if (this._queue.length > 0) {
      this._onReady();
    }
  }

  public get pendingUploads(): number {
    return this._queue.length;
  }

  private _retain(tex: Texture): void {
    if (tex.refCount === 0) {
      this._lru.delete(tex);
    }

    tex.refCount++;
  }

  private _load(tex: Texture, src: string): void {
    if (!this.firstLoadAt) {
      this.firstLoadAt = performance.now();
    }

    const done = (source: Source) => {
      if (tex.state !== TEX_LOADING) {
        return;
      }

      tex.source = source;
      tex.state = TEX_PENDING_UPLOAD;
      this._queue.push(tex);
      this._onReady();
    };
    const fail = () => {
      tex.state = TEX_FAILED;
      flushWaiters(tex);
    };

    const viaImage = () => {
      const img = new Image();

      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (typeof img.decode === 'function') {
          img.decode().then(
            () => done(img),
            () => done(img),
          );
        } else {
          done(img);
        }
      };
      img.onerror = fail;
      img.src = src;
    };
    const lower = src.slice(0, 32).toLowerCase();
    const isSvg = lower.startsWith('data:image/svg') || /\.svg(\?|#|$)/i.test(src);

    if (this._bitmapOk && !isSvg) {
      fetch(src, { mode: 'cors', credentials: 'omit' })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((blob) =>
          createImageBitmap(blob, {
            premultiplyAlpha: 'premultiply',
            colorSpaceConversion: 'none',
          }).catch(() =>
            // Chrome < 59-ish rejects the options bag; retry without it.
            createImageBitmap(blob),
          ),
        )
        .then(done, (e: unknown) => {
          // Status errors are final; a decode error may still work through <img> (e.g. svg served without the extension).
          if (e instanceof Error && /^\d+$/.test(e.message)) {
            fail();
          } else {
            viaImage();
          }
        });

      return;
    }

    viaImage();
  }

  private _upload(tex: Texture, source: Source): void {
    const gl = this._gl;
    const glTex = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, glTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    setParams(gl);

    const w = (source as { width: number }).width;
    const h = (source as { height: number }).height;

    tex.glTexture = glTex;
    tex.w = w;
    tex.h = h;
    tex.bytes = w * h * 4;
    tex.state = TEX_READY;
    this.memoryUsed += tex.bytes;
    this.uploadsThisFrame++;
    this.totalUploads++;

    if (typeof (source as ImageBitmap).close === 'function') {
      (source as ImageBitmap).close();
    }

    tex.source = null;
    flushWaiters(tex);
    this._evict();
  }

  private _evict(): void {
    if (this.memoryUsed <= this._memoryCap) {
      return;
    }

    for (const tex of this._lru.keys()) {
      if (this.memoryUsed <= this._memoryCap) {
        break;
      }

      this._lru.delete(tex);
      this._cache.delete(tex.key);

      if (tex.glTexture) {
        this._gl.deleteTexture(tex.glTexture);
        tex.glTexture = null;
        this.memoryUsed -= tex.bytes;
      }

      tex.state = TEX_FAILED;
    }
  }
}

function flushWaiters(tex: Texture): void {
  const waiters = tex.waiters;

  tex.waiters = null;

  if (waiters) {
    for (let i = 0; i < waiters.length; i++) {
      waiters[i]();
    }
  }
}

function setParams(gl: WebGLRenderingContext): void {
  // NPOT-safe in WebGL1: no mipmaps, clamp, linear.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

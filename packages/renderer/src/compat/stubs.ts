const warned = new Set<string>();

function warnOnce(name: string): void {
  if (warned.has(name)) {
    return;
  }

  warned.add(name);
  console.warn(`[compat-renderer] ${name} is a stub`);
}

function stubClass(name: string) {
  return class {
    public constructor() {
      warnOnce(name);
    }
  };
}

export enum TextureErrorCode {
  INVALID_TYPE = 'INVALID_TYPE',
  FAILED_TO_LOAD = 'FAILED_TO_LOAD',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
}

export class TextureError extends Error {
  public code: TextureErrorCode;

  public constructor(code: TextureErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export const isTextureError = (e: unknown): e is TextureError => e instanceof TextureError;

export const CoreTextureManager = stubClass('CoreTextureManager');
export const CoreShaderNode = stubClass('CoreShaderNode');
export const WebGlShaderProgram = stubClass('WebGlShaderProgram');
export const WebGlShaderNode = stubClass('WebGlShaderNode');
export const CanvasShaderNode = stubClass('CanvasShaderNode');

export function deg2Rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function assertTruthy(value: unknown, message?: string): asserts value {
  if (!value) {
    throw new Error(message ?? 'Assertion failed');
  }
}

export function getNormalizedRgbaComponents(rgba: number): [number, number, number, number] {
  return [
    (rgba >>> 24) / 255,
    ((rgba >>> 16) & 0xff) / 255,
    ((rgba >>> 8) & 0xff) / 255,
    (rgba & 0xff) / 255,
  ];
}

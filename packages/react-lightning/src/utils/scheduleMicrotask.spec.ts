import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('scheduleMicrotask', () => {
  it('falls back to a promise when queueMicrotask is missing', async () => {
    vi.stubGlobal('queueMicrotask', undefined);
    const { scheduleMicrotask } = await import('./scheduleMicrotask');
    const callback = vi.fn();

    scheduleMicrotask(callback);
    expect(callback).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('uses queueMicrotask when it exists', async () => {
    const native = vi.fn();
    vi.stubGlobal('queueMicrotask', native);
    const { scheduleMicrotask } = await import('./scheduleMicrotask');
    const callback = vi.fn();

    scheduleMicrotask(callback);
    expect(native).toHaveBeenCalledWith(callback);
  });
});

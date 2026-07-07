import { describe, expect, it } from 'vitest';

import { resolveAtlasUrl } from './resolveAtlasUrl';

describe('resolveAtlasUrl', () => {
  const base = 'https://host.example/app/';

  it('resolves a root-relative URL against the base origin', () => {
    expect(resolveAtlasUrl('/fonts/inter/Regular.msdf.json', base)).toBe(
      'https://host.example/fonts/inter/Regular.msdf.json',
    );
  });

  it('resolves a relative URL against the base path', () => {
    expect(resolveAtlasUrl('fonts/Regular.msdf.json', base)).toBe(
      'https://host.example/app/fonts/Regular.msdf.json',
    );
  });

  it('leaves an absolute http URL unchanged', () => {
    const abs = 'https://cdn.example/fonts/Regular.msdf.json';
    expect(resolveAtlasUrl(abs, base)).toBe(abs);
  });

  it('leaves a data URL unchanged', () => {
    const data = 'data:application/json,{}';
    expect(resolveAtlasUrl(data, base)).toBe(data);
  });

  it('returns the input unchanged when no base is available', () => {
    expect(resolveAtlasUrl('/fonts/Regular.msdf.json', undefined)).toBe(
      '/fonts/Regular.msdf.json',
    );
  });

  it('does not resolve against a blob base (the worker trap)', () => {
    // A blob base can't resolve a root-relative path; the whole point is that
    // we resolve on the main thread against the real document URL, never here.
    const blob = 'blob:https://host.example/uuid';
    expect(resolveAtlasUrl('/fonts/Regular.msdf.json', blob)).toBe(
      '/fonts/Regular.msdf.json',
    );
  });
});

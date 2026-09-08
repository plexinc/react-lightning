import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolvePseudoStyle } from './resolvePseudoStyle';
import type { SupportedPseudoSelector } from './types';
import { resetWarnOnce } from './warnOnce';

const active = (...selectors: SupportedPseudoSelector[]) => new Set(selectors);

describe('resolvePseudoStyle', () => {
  beforeEach(() => {
    resetWarnOnce();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('resolves to the resting values while nothing is active', () => {
    expect(resolvePseudoStyle({ opacity: 1 }, { ':focus': { opacity: 0.5 } }, active())).toEqual({
      opacity: 1,
    });
  });

  it('resolves to the selector value while it is active', () => {
    expect(
      resolvePseudoStyle({ opacity: 1 }, { ':focus': { opacity: 0.5 } }, active(':focus')),
    ).toEqual({ opacity: 0.5 });
  });

  it('lets :focus win over :focus-within', () => {
    expect(
      resolvePseudoStyle(
        { opacity: 1 },
        { ':focus': { opacity: 0.5 }, ':focus-within': { opacity: 0.8 } },
        active(':focus', ':focus-within'),
      ),
    ).toEqual({ opacity: 0.5 });
  });

  it('keeps a lower-priority active value for a prop the winner does not set', () => {
    expect(
      resolvePseudoStyle(
        { opacity: 1, padding: 0 },
        { ':focus': { opacity: 0.5 }, ':focus-within': { padding: 10 } },
        active(':focus', ':focus-within'),
      ),
    ).toEqual({ opacity: 0.5, padding: 10 });
  });

  it('only returns props a selector mentions', () => {
    expect(
      resolvePseudoStyle({ opacity: 1, padding: 10 }, { ':focus': { opacity: 0.5 } }, active()),
    ).toEqual({ opacity: 1 });
  });

  it('drops a prop with no resting value, since it could never be reverted', () => {
    expect(resolvePseudoStyle({}, { ':focus': { opacity: 0.5 } }, active())).toEqual({});
    expect(console.warn).toHaveBeenCalledOnce();
  });
});

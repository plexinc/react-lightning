import { describe, expect, it } from 'vitest';

import { resolveSectionSize } from './resolveSectionSize';

describe('resolveSectionSize', () => {
  it('reserves nothing when there is no section component', () => {
    expect(resolveSectionSize(false, 120, 40)).toBe(0);
  });

  it('uses the measured size once the section has laid out', () => {
    expect(resolveSectionSize(true, 120, 0)).toBe(120);
  });

  it('prefers the measured size over the caller estimate', () => {
    expect(resolveSectionSize(true, 120, 40)).toBe(120);
  });

  it('falls back to the caller estimate before measurement', () => {
    expect(resolveSectionSize(true, 0, 40)).toBe(40);
  });

  it('is zero when present but neither measured nor estimated', () => {
    expect(resolveSectionSize(true, 0, 0)).toBe(0);
  });
});

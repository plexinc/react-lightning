import { describe, expect, it } from 'vitest';
import { CompatShader, Border, cornerRadii, normalizeProp, resolveShaderProps } from './Shaders';

describe('normalizeProp', () => {
  it('maps align strings like Lightning', () => {
    expect(normalizeProp('border-align', 'outside')).toBe(1);
    expect(normalizeProp('align', 'center')).toBe(0.5);
    expect(normalizeProp('align', 'inside')).toBe(0);
    expect(normalizeProp('border-align', 0.25)).toBe(0.25);
    expect(normalizeProp('color', 'outside')).toBe('outside');
  });

  it('applies to resolved and later-set props', () => {
    const props = resolveShaderProps(Border, { align: 'outside', w: 2 });

    expect(props.align).toBe(1);

    const shader = new CompatShader('Border', props, () => {});

    shader.props.align = 'center';
    expect(shader.props.align).toBe(0.5);
  });
});

describe('cornerRadii', () => {
  const out = [0, 0, 0, 0];

  it('returns a uniform radius for a number', () => {
    expect(cornerRadii({ radius: 16 }, 240, 360, out)).toBe(16);
  });

  it('caps a pill radius at half the short side', () => {
    expect(cornerRadii({ radius: 9999 }, 117, 48, out)).toBeCloseTo(24, 5);
  });

  it('fills short arrays CSS-style and reports per-corner radii', () => {
    expect(cornerRadii({ radius: [8, 0] }, 100, 100, out)).toBe(-1);
    expect(out).toEqual([8, 0, 8, 0]);
    expect(cornerRadii({ radius: [1, 2, 3] }, 100, 100, out)).toBe(-1);
    expect(out).toEqual([1, 2, 3, 1]);
  });

  it('scales every corner by the same factor when neighbours overlap', () => {
    cornerRadii({ radius: [60, 60, 0, 0] }, 100, 200, out);
    expect(out[0]).toBeCloseTo(50, 5);
    expect(out[1]).toBeCloseTo(50, 5);
    expect(out[2]).toBe(0);
  });

  it('lets corner keys override the array', () => {
    expect(cornerRadii({ radius: 0, 'top-left': 12 }, 100, 100, out)).toBe(-1);
    expect(out).toEqual([12, 0, 0, 0]);
  });
});

describe('CompatShader.cornerRadii', () => {
  it('recomputes after a prop change', () => {
    const shader = new CompatShader('Rounded', { radius: 10 }, () => {});

    expect(shader.cornerRadii(100, 100)).toBe(10);
    shader.props.radius = [4, 0];
    expect(shader.cornerRadii(100, 100)).toBe(-1);
    expect(shader.radii).toEqual([4, 0, 4, 0]);
    expect(shader.cornerRadii(6, 100)).toBe(-1);
    expect(shader.radii[0]).toBeCloseTo(4, 5);
  });
});

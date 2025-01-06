import type { ColorValue } from 'react-native';
import { describe, expect, it } from 'vitest';
import { htmlColorToLightningColor } from './htmlColorToLightningColor';

describe('htmlColorToLightningColor', () => {
  it('should convert an rgb hex to a number', () => {
    const value = '#ff00ff';
    const expected = 0xff00ffff;
    const actual = htmlColorToLightningColor(value);

    expect(actual).toBe(expected);
  });

  it('should convert an rgb hex without the hash to a number', () => {
    const value = 'ab77ff';
    const expected = 0xab77ffff;
    const actual = htmlColorToLightningColor(value);

    expect(actual).toBe(expected);
  });

  it('should convert a short rgb hex to a number', () => {
    const value = '#f0f';
    const expected = 0xff00ffff;
    const actual = htmlColorToLightningColor(value);

    expect(actual).toBe(expected);
  });

  it('should convert a short rgb hex without the hash to a number', () => {
    const value = '900';
    const expected = 0x990000ff;
    const actual = htmlColorToLightningColor(value);

    expect(actual).toBe(expected);
  });

  it('should convert rgb string to a number', () => {
    const value = 'rgb(244, 164, 96)';
    const expected = 0xf4a460ff;
    const actual = htmlColorToLightningColor(value);

    expect(actual).toBe(expected);
  });

  it('should convert rgba string to a number', () => {
    const value = 'rgba(244, 164, 96, 0.4)';
    const expected = 0xf4a46066;
    const actual = htmlColorToLightningColor(value);

    expect(actual).toBe(expected);
  });

  it('should convert html color code to a number', () => {
    const value = 'sandybrown';
    const expected = 0xf4a460ff;
    const actual = htmlColorToLightningColor(value);

    expect(actual).toBe(expected);
  });

  it('should override the alpha value if provided', () => {
    const values: [ColorValue | number, number][] = [
      ['#ff00ff', 0xff00ff66],
      ['ab77ff', 0xab77ff66],
      ['#f0f', 0xff00ff66],
      ['900', 0x99000066],
      ['sandybrown', 0xf4a46066],
      [0xab77ffff, 0xab77ff66],
    ];

    for (const [value, expected] of values) {
      const actual = htmlColorToLightningColor(value, 0x66);

      expect(actual).toBe(expected);
    }
  });

  it('should throw an error if an invalid hex was given', () => {
    const value = '#abcd';

    const run = (): void => {
      htmlColorToLightningColor(value);
    };

    expect(run).toThrow('Invalid hex value');
  });

  it('should throw an error if html color code is not a web X11 color', () => {
    const value = 'sandybrownzzzz';
    const run = (): void => {
      htmlColorToLightningColor(value);
    };

    expect(run).toThrow('Invalid hex value');
  });
});

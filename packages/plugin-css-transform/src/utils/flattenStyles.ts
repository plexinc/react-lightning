import type { StyleProp } from 'react-native';
import type { AllStyleProps, AllStyles } from '../types/ReactStyle';

export function flattenStyles<T extends AllStyles>(styles: AllStyleProps): T {
  if (styles === false) {
    return {} as T;
  }

  if (typeof styles === 'string') {
    try {
      return JSON.parse(styles);
    } catch (err) {
      console.warn('There was an error parsing the style: ', styles, '\n', err);
      return {} as T;
    }
  }

  if (Array.isArray(styles)) {
    const finalStyle: T = {} as T;

    for (const style of styles) {
      Object.assign(finalStyle, flattenStyles(style as StyleProp<AllStyles>));
    }

    return finalStyle;
  }

  return (styles as T) ?? {};
}

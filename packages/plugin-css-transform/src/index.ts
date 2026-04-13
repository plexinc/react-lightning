import type { Plugin } from '@plextv/react-lightning';

import { convertCSSStyleToLightning } from './convertCSSStyleToLightning';
import type { AllStyleProps } from './types/ReactStyle';

export { convertCSSStyleToLightning };
export * from './types';
export { convertCSSTransformToLightning } from './utils/convertCSSTransformToLightning';
export { flattenStyles } from './utils/flattenStyles';
export { htmlColorToLightningColor } from './utils/htmlColorToLightningColor';
export { parseTransform } from './utils/parseTransform';

const CSS_HANDLED_STYLE_PROPS: ReadonlySet<string> = new Set([
  'backgroundColor',
  'color',
  'border',
  'borderWidth',
  'borderColor',
  'shadowColor',
  'opacity',
  'overflow',
  'overflowX',
  'overflowY',
  'tintColor',
  'fontWeight',
  'transform',
  'width',
  'height',
  'left',
  'top',
  'display',
]);

export function plugin(): Plugin {
  return {
    handledStyleProps: CSS_HANDLED_STYLE_PROPS,

    transformProps(_instance, props) {
      if (!('style' in props)) {
        return props;
      }

      const { style, ...otherProps } = props;

      return {
        ...otherProps,
        style: convertCSSStyleToLightning(style as AllStyleProps),
      };
    },
  };
}

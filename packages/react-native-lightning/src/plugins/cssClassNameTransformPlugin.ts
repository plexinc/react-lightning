import type { Plugin } from '@plex/react-lightning';
import { StyleSheet } from 'react-native-web';

type ReactNativeWebStyleSheet = StyleSheet & {
  getSheet(): { id: string; textContent: string };
};

function camelize(text: string) {
  return text.trim().replace(/-(.)/g, (_, letter) => letter.toUpperCase());
}

export const cssClassNameTransformPlugin = (): Plugin => {
  const sheet = new CSSStyleSheet();
  const cache: Record<string, Record<string, string>> = {};
  let currentCssText = '';

  function parseStyle(cssText: string) {
    if (!cache[cssText]) {
      const styleObject: Record<string, string> = {};

      for (const style of cssText.split(';')) {
        const [key, value] = style.split(':');

        if (key && value) {
          styleObject[camelize(key)] = value.trim();
        }
      }

      cache[cssText] = styleObject;
    }

    return cache[cssText];
  }

  return {
    transformProps(_instance, props) {
      if (!('className' in props)) {
        return props;
      }

      const newCssText = (
        StyleSheet as unknown as ReactNativeWebStyleSheet
      ).getSheet().textContent;

      if (newCssText !== currentCssText) {
        sheet.replaceSync(newCssText);
        currentCssText = newCssText;
      }

      const { className, style, ...otherProps } = props;
      let finalStyle: typeof style = {};

      if (typeof className === 'string') {
        for (const value of className.split(' ')) {
          let selectedRule: CSSStyleRule | null = null;

          for (const rule of sheet.cssRules) {
            if (
              rule &&
              'selectorText' in rule &&
              rule.selectorText === `.${value}`
            ) {
              selectedRule = rule as CSSStyleRule;
              break;
            }
          }

          if (selectedRule) {
            finalStyle = {
              ...finalStyle,
              ...parseStyle(selectedRule.style.cssText),
            };
          }
        }
      }

      return {
        ...otherProps,
        className: className,
        style: { ...finalStyle, ...style },
      };
    },
  };
};

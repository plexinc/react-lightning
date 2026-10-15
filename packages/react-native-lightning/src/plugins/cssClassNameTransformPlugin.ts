import type { Plugin } from '@plextv/react-lightning';

function camelize(text: string) {
  return text.trim().replace(/-(.)/g, (_, letter) => letter.toUpperCase());
}

export const cssClassNameTransformPlugin = (): Plugin => {
  const sheet = Array.from(document.styleSheets).find((s) => {
    const node = s.ownerNode;

    return node && 'id' in node ? node.id === 'react-native-stylesheet' : null;
  }) ?? { cssRules: [] };

  const cache: Record<string, Record<string, string>> = {};

  // Update payloads only carry changed props, so a style-only update arrives without the
  // (unchanged) className. Remember the resolved styles per instance or they read as removed.
  const resolvedClassStyles = new WeakMap<object, Record<string, string>>();

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
    // Only updates that carry className, or land on an instance with resolved class styles to
    // merge back in, need the transform. Everything else can take the style fast path.
    needsTransform(instance, props) {
      return 'className' in props || resolvedClassStyles.has(instance);
    },

    transformProps(instance, props) {
      if (!('className' in props)) {
        const remembered = resolvedClassStyles.get(instance);

        if (remembered && props.style) {
          return {
            ...props,
            style: { ...remembered, ...props.style },
          };
        }

        return props;
      }

      const { className, style, ...otherProps } = props;
      let finalStyle: typeof style = {};

      if (typeof className === 'string') {
        for (const value of className.split(' ')) {
          let selectedRule: CSSStyleRule | null = null;

          for (const rule of sheet.cssRules) {
            if (rule && 'selectorText' in rule && rule.selectorText === `.${value}`) {
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

      // Nothing to merge back for an empty resolution, so later style-only updates stay fast.
      let hasClassStyles = false;

      for (const _ in finalStyle) {
        hasClassStyles = true;
        break;
      }

      if (hasClassStyles) {
        resolvedClassStyles.set(instance, finalStyle as Record<string, string>);
      } else {
        resolvedClassStyles.delete(instance);
      }

      return {
        ...otherProps,
        className: className,
        style: { ...finalStyle, ...style },
      };
    },
  };
};

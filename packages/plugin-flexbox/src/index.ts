import type { LightningElement, LightningElementStyle, Plugin } from '@plextv/react-lightning';

import { LightningManager } from './LightningManager';
import { setFlexboxManager } from './manager';
import type { YogaOptions } from './types/YogaOptions';
import { flexProps, isFlexStyleProp } from './util/isFlexStyleProp';

const BORDER_PROPS: ReadonlySet<string> = new Set([
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
]);

// Yoga only wants the numeric edge width; the renderer keeps the full
// border style (css-transform hands us `{ w, color }`, a bare number, or a
// per-edge number).
function borderWidth(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (value != null && typeof value === 'object' && 'w' in value) {
    return (value as { w?: number }).w ?? 0;
  }

  return 0;
}

export function plugin(yogaOptions?: YogaOptions): Plugin<LightningElement> {
  const lightningManager = new LightningManager();

  setFlexboxManager(lightningManager);

  return {
    handledStyleProps: new Set(Object.keys(flexProps)),

    init() {
      return lightningManager.init(yogaOptions);
    },

    onCreateInstance(instance: LightningElement) {
      lightningManager.trackElement(instance);
    },

    transformProps(instance, props) {
      const styles = props.style;

      if (!styles) {
        return props;
      }

      // Fast scan: detect whether ANY flex prop is in the style object
      // before allocating the split objects. The vast majority of elements
      // in a typical UI tree (text nodes, image leaves, decorative views)
      // carry no flex-relevant props, and this fast path returns the
      // original props untouched — saving three allocations per call
      // (`flexStyles`, `remainingStyles`, and the `{ ...props }` spread).
      let hasFlexStyles = false;

      for (const key in styles) {
        if (
          key === 'w' ||
          key === 'h' ||
          key === 'maxWidth' ||
          key === 'maxHeight' ||
          isFlexStyleProp(key)
        ) {
          hasFlexStyles = true;
          break;
        }
      }

      if (!hasFlexStyles) {
        return props;
      }

      const flexStyles: Record<string, unknown> = {};
      const remainingStyles: Record<string, unknown> = {};

      for (const key in styles) {
        const value = styles[key as keyof LightningElementStyle];

        if (key === 'w' || key === 'h' || key === 'maxWidth' || key === 'maxHeight') {
          // Width and height go to both flex and remaining styles
          flexStyles[key] = value;
          remainingStyles[key] = value;
        } else if (BORDER_PROPS.has(key)) {
          // Border reaches both: the renderer paints it, Yoga reserves its
          // box (border-box, like react-native) so a `margin: -border`
          // compensation doesn't shift the content when the border toggles.
          remainingStyles[key] = value;

          if (value != null) {
            flexStyles[key] = borderWidth(value);
          }
        } else if (isFlexStyleProp(key) && value != null) {
          flexStyles[key] = value;
        } else {
          remainingStyles[key] = value;
        }
      }

      // flexStyles is complete for this render, so a missing key means the
      // prop was dropped: reset it instead of leaving yoga's stale value.
      lightningManager.applyStyle(
        instance.id,
        flexStyles as Partial<LightningElementStyle>,
        true,
        true,
      );

      return {
        ...props,
        style: remainingStyles as Partial<LightningElementStyle>,
      };
    },
  };
}

export { FlexBoundary, FlexRoot, useIsInFlex } from './wrappers';
export type { FlexBoundaryProps, FlexRootProps } from './wrappers';
export * from './types';

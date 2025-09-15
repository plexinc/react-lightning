import type {
  LightningElement,
  LightningElementStyle,
  Plugin,
} from '@plextv/react-lightning';
import { LightningManager } from './LightningManager';
import type { YogaOptions } from './types/YogaOptions';
import { isFlexStyleProp } from './util/isFlexStyleProp';

export function plugin(yogaOptions?: YogaOptions): Plugin<LightningElement> {
  const lightningManager = new LightningManager();

  return {
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

      const flexStyles: Record<string, unknown> = {};
      const remainingStyles: Record<string, unknown> = {};
      let hasFlexStyles = false;

      // Direct property iteration is faster than Object.entries + reduce
      for (const key in styles) {
        const value = styles[key as keyof LightningElementStyle];

        if (
          key === 'w' ||
          key === 'h' ||
          key === 'maxWidth' ||
          key === 'maxHeight'
        ) {
          // Width and height go to both flex and remaining styles
          flexStyles[key] = value;
          remainingStyles[key] = value;
          hasFlexStyles = true;
        } else if (isFlexStyleProp(key) && value != null) {
          flexStyles[key] = value;
          hasFlexStyles = true;
        } else {
          remainingStyles[key] = value;
        }
      }

      if (hasFlexStyles) {
        lightningManager.applyStyle(
          instance.id,
          flexStyles as Partial<LightningElementStyle>,
          true,
        );
      }

      return {
        ...props,
        style: remainingStyles as Partial<LightningElementStyle>,
      };
    },
  };
}

export * from './types';

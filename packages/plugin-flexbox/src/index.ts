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

      const [flexStyles, remainingStyles] = Object.entries(styles).reduce(
        ([flex, remaining], [key, value]) => {
          const prop = key as keyof LightningElementStyle;

          if (prop === 'width' || prop === 'height') {
            flex[prop] = value;
            remaining[prop] = value;
          } else if (isFlexStyleProp(prop) && value != null) {
            flex[prop] = value;
          } else {
            remaining[prop] = value;
          }

          return [flex, remaining];
        },
        [{}, {}] as [
          Partial<LightningElementStyle>,
          Partial<LightningElementStyle>,
        ],
      );

      lightningManager.applyStyle(instance.id, flexStyles, true);

      return { ...props, style: remainingStyles };
    },
  };
}

export * from './types';

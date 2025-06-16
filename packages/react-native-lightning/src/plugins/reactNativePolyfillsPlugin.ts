import { LightningViewElement, type Plugin } from '@plextv/react-lightning';
import { flattenStyles } from '@plextv/react-lightning-plugin-css-transform';
import type { NativeMethods } from 'react-native';

type LightningNativeViewElement = NativeMethods &
  LightningViewElement & {
    __loaded?: boolean;
    __loadPromise: Promise<void>;
  };

export const reactNativePolyfillsPlugin = (): Plugin => {
  return {
    async init() {
      const originalSetProps = LightningViewElement.prototype.setProps;

      const nativeMethods = {
        // React native allows arrays to be used for styles, but react-lightning
        // does not. This polyfill flattens the styles array into a single object
        // before passing it to the original setProps method.
        setProps(props) {
          if (props.style && Array.isArray(props.style)) {
            props.style = flattenStyles(props.style);
          }

          return originalSetProps.call(this, props);
        },
        measure(this: LightningNativeViewElement, callback) {
          // Avoid going through the promise if we've already loaded
          if (this.__loaded) {
            const rect = this.getBoundingClientRect();
            callback(
              this.node.x,
              this.node.y,
              rect.width,
              rect.height,
              rect.x,
              rect.y,
            );
          } else {
            this.__loadPromise.then(() =>
              nativeMethods.measure.call(this, callback),
            );
          }
        },
        measureInWindow(this: LightningNativeViewElement, callback) {
          if (this.__loaded) {
            callback(
              this.node.x,
              this.node.y,
              this.node.width,
              this.node.height,
            );
          } else {
            this.__loadPromise.then(() =>
              nativeMethods.measureInWindow.call(this, callback),
            );
          }
        },
        measureLayout(this: LightningNativeViewElement, relative, onSuccess) {
          if (this.__loaded) {
            const { x, y } = this.getRelativePosition(
              relative as unknown as LightningViewElement,
            );

            onSuccess(x, y, this.node.width, this.node.height);
          } else {
            this.__loadPromise.then(() =>
              nativeMethods.measureLayout.call(this, relative, onSuccess),
            );
          }
        },
        setNativeProps(this: LightningNativeViewElement, props) {
          Object.assign(this.node, props);
        },
      } satisfies Partial<LightningNativeViewElement>;

      Object.defineProperties(
        LightningViewElement.prototype,
        Object.entries(nativeMethods).reduce((acc, [key, value]) => {
          acc[key] = {
            // Instead of using the `value` property, we use a getter to return
            // the function and use an empty setter. This is to prevent errors
            // from being thrown when react-native-web tries to use
            // `useNativeMethods` to add these functions.
            get: () => value,
            set: () => {
              /* Noop */
            },
            configurable: false,
            enumerable: false,
          };

          return acc;
        }, {} as PropertyDescriptorMap),
      );
    },

    onCreateInstance(instance) {
      const nativeInstance = instance as LightningNativeViewElement;

      // Initialize the load promise to resolve when the instance is laid out
      nativeInstance.__loadPromise = new Promise<void>((resolve) => {
        nativeInstance.once('layout', () => {
          nativeInstance.__loaded = true;
          resolve();
        });
      });
    },
  };
};

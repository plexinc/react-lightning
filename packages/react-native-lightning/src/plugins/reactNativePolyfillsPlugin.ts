import type { LightningViewElement, Plugin } from '@plex/react-lightning';
import type { NativeMethods } from 'react-native';

export const reactNativePolyfillsPlugin = (): Plugin => {
  return {
    onCreateInstance(instance) {
      const loadPromise = new Promise<void>((resolve) => {
        instance.on('layout', () => {
          resolve();
        });
      });

      const nativeMethods: Partial<NativeMethods> = {
        measure(this: LightningViewElement, callback) {
          loadPromise
            .then(() => {
              const { x, y, width, height } = this.getBoundingClientRect();
              callback(this.node.x, this.node.y, width, height, x, y);
            })
            .catch(() => {
              // Do nothing
            });
        },
        measureInWindow(this: LightningViewElement, callback) {
          loadPromise
            .then(() => {
              callback(
                this.node.x,
                this.node.y,
                this.node.width,
                this.node.height,
              );
            })
            .catch(() => {
              // Do nothing
            });
        },
        measureLayout(this: LightningViewElement, relative, onSuccess) {
          loadPromise
            .then(() => {
              const { x, y } = this.getRelativePosition(
                relative as unknown as LightningViewElement,
              );

              onSuccess(x, y, this.node.width, this.node.height);
            })
            .catch(() => {
              // Do nothing
            });
        },
        setNativeProps(this: LightningViewElement, props) {
          Object.assign(this.node, props);
        },
      };

      Object.defineProperties(
        instance,
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
  };
};

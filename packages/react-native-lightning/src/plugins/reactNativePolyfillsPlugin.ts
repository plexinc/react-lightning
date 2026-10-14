import { type Fiber as ItsFineFiber, traverseFiber } from 'its-fine';
import type { NativeMethods } from 'react-native';
import type { Fiber } from 'react-reconciler';

import {
  type FocusManager,
  getFocusManager,
  LightningViewElement,
  type Plugin,
} from '@plextv/react-lightning';
import { flattenStyles } from '@plextv/react-lightning-plugin-css-transform';

type LightningNativeViewElement = NativeMethods &
  LightningViewElement & {
    __loaded?: boolean;
    __loadPromise?: Promise<void>;
    __resolveLoad?: () => void;
    setDestinations(destinations?: LightningViewElement[]): void;
    requestTVFocus(): void;
  };

// Kind of hacky, but we can't use hooks here. We need to somehow traverse the
// fiber tree to find the focus manager though, so we can set destinations for
// focusable elements.
function tryFindFocusManager(fiber: Fiber): FocusManager<LightningViewElement> | null {
  try {
    const context = traverseFiber(
      fiber as ItsFineFiber,
      true,
      (f) =>
        (f.type?.$$typeof === Symbol.for('react.provider') ||
          f.type?.$$typeof === Symbol.for('react.context')) &&
        !!f.memoizedProps.value?.focusManager,
    );

    if (context) {
      return context.memoizedProps.value.focusManager as FocusManager<LightningViewElement>;
    }
  } catch (error) {
    console.warn('[react-native-lightning] React fiber access failed:', error);
  }

  return null;
}

function whenLoaded(element: LightningNativeViewElement): Promise<void> {
  element.__loadPromise ??= new Promise<void>((resolve) => {
    element.__resolveLoad = resolve;
  });

  return element.__loadPromise;
}

let polyfilled = false;

export const reactNativePolyfillsPlugin = (): Plugin => {
  let fiberFocusManager: FocusManager<LightningViewElement> | null = null;

  const resolveFocusManager = (
    element: LightningNativeViewElement,
  ): FocusManager<LightningViewElement> | null => {
    const active = getFocusManager() as FocusManager<LightningViewElement> | null;

    if (active) {
      return active;
    }

    fiberFocusManager ??= tryFindFocusManager(element.node.__reactFiber);

    return fiberFocusManager;
  };

  return {
    async init() {
      if (polyfilled) {
        return;
      }

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
            callback(this.node.x, this.node.y, rect.w, rect.h, rect.x, rect.y);
          } else {
            whenLoaded(this).then(() => nativeMethods.measure.call(this, callback));
          }
        },
        measureInWindow(this: LightningNativeViewElement, callback) {
          if (this.__loaded) {
            callback(this.node.x, this.node.y, this.node.w, this.node.h);
          } else {
            whenLoaded(this).then(() => nativeMethods.measureInWindow.call(this, callback));
          }
        },
        measureLayout(this: LightningNativeViewElement, relative, onSuccess) {
          if (this.__loaded) {
            const { x, y } = this.getRelativePosition(relative as unknown as LightningViewElement);

            onSuccess(x, y, this.node.w, this.node.h);
          } else {
            whenLoaded(this).then(() =>
              nativeMethods.measureLayout.call(this, relative, onSuccess),
            );
          }
        },
        setNativeProps(this: LightningNativeViewElement, props) {
          Object.assign(this.node, props);
        },
        setDestinations(this: LightningNativeViewElement, destinations) {
          const focusManager = resolveFocusManager(this);

          if (!focusManager) {
            console.warn(
              '[react-native-lightning polyfills] FocusManager not found, cannot set destinations',
            );

            return;
          }

          focusManager.setDestinations(this, destinations);
        },
        requestTVFocus(this: LightningNativeViewElement): void {
          const focusManager = resolveFocusManager(this);

          if (!focusManager) {
            console.warn(
              '[react-native-lightning polyfills] FocusManager not found, failed to request focus',
            );

            return;
          }

          focusManager.focus(this);
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

      polyfilled = true;
    },

    onCreateInstance(instance) {
      const nativeInstance = instance as LightningNativeViewElement;

      nativeInstance.once('layout', () => {
        nativeInstance.__loaded = true;
        nativeInstance.__resolveLoad?.();
      });
    },
  };
};

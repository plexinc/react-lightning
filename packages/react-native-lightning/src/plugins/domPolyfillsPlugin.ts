import {
  type LightningElementEvents,
  type LightningElementProps,
  LightningViewElement,
  type Plugin,
} from '@plextv/react-lightning';
import type { NativeLightningViewElement } from '../types/NativeLightningViewElement';

const ELEMENT_NODE = 1;

export const domPolyfillsPlugin = (): Plugin => {
  const domMethods = {
    dispatchEvent(this: LightningViewElement, event: Event): boolean {
      this.emit('event', event);

      return true;
    },

    addEventListener<K extends keyof LightningElementEvents>(
      this: LightningViewElement,
      type: K,
      listener: LightningElementEvents[K],
    ): void {
      this.on(type, listener);
    },

    removeEventListener<K extends keyof LightningElementEvents>(
      this: LightningViewElement,
      type: K,
      listener: LightningElementEvents[K],
    ): void {
      this.off(type, listener);
    },

    getAttribute<K extends keyof LightningElementProps>(
      this: LightningViewElement,
      name: K,
    ): LightningElementProps[K] {
      return this.props[name];
    },

    __scrollLeft: 0,
    __scrollTop: 0,
  };

  const domAccessors = {
    clientWidth: {
      get(this: LightningViewElement) {
        return this.node.w;
      },
    },

    clientHeight: {
      get(this: LightningViewElement) {
        return this.node.h;
      },
    },

    offsetWidth: {
      get(this: LightningViewElement) {
        return this.node.w;
      },
    },

    offsetHeight: {
      get(this: LightningViewElement) {
        return this.node.h;
      },
    },

    offsetLeft: {
      get(this: LightningViewElement) {
        return this.node.x;
      },
    },

    offsetTop: {
      get(this: LightningViewElement) {
        return this.node.y;
      },
    },

    isConnected: {
      get(this: LightningViewElement) {
        return !!this.parent;
      },
    },

    parentNode: {
      get(this: LightningViewElement) {
        return this.parent;
      },
    },

    parentElement: {
      get(this: LightningViewElement) {
        return this.parent;
      },
    },

    nodeType: {
      get(this: LightningViewElement) {
        return ELEMENT_NODE;
      },
    },

    scrollLeft: {
      get(this: NativeLightningViewElement) {
        return this.__scrollLeft;
      },
      set(this: NativeLightningViewElement, value: number) {
        this.__scrollLeft = value;
      },
    },

    scrollTop: {
      get(this: NativeLightningViewElement) {
        return this.__scrollTop;
      },
      set(this: NativeLightningViewElement, value: number) {
        this.__scrollTop = value;
      },
    },
  } satisfies Record<string, PropertyDescriptor>;

  return {
    init() {
      if ('__domPolyfillsAdded' in LightningViewElement.prototype) {
        return Promise.resolve();
      }

      Object.defineProperties(
        LightningViewElement.prototype,
        Object.entries(domMethods).reduce((acc, [key, value]) => {
          acc[key] = {
            value,
            configurable: false,
            enumerable: false,
            writable: typeof value !== 'function',
          };

          return acc;
        }, {} as PropertyDescriptorMap),
      );

      Object.defineProperties(
        LightningViewElement.prototype,
        Object.entries(domAccessors).reduce((acc, [key, value]) => {
          acc[key] = {
            configurable: false,
            enumerable: false,
            ...value,
          };

          return acc;
        }, {} as PropertyDescriptorMap),
      );

      Object.defineProperty(
        LightningViewElement.prototype,
        '__domPolyfillsAdded',
        {
          value: true,
          configurable: false,
          enumerable: false,
          writable: false,
        },
      );

      return Promise.resolve();
    },
  };
};

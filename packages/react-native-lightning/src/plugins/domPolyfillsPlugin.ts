import {
  type LightningElementEvents,
  LightningViewElement,
  type Plugin,
} from '@plextv/react-lightning';

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
  };

  const domAccessors = {
    clientWidth(this: LightningViewElement) {
      return this.node.w;
    },

    clientHeight(this: LightningViewElement) {
      return this.node.h;
    },

    offsetWidth(this: LightningViewElement) {
      return this.node.w;
    },

    offsetHeight(this: LightningViewElement) {
      return this.node.h;
    },

    offsetLeft(this: LightningViewElement) {
      return this.node.x;
    },

    offsetTop(this: LightningViewElement) {
      return this.node.y;
    },

    isConnected(this: LightningViewElement) {
      return !!this.parent;
    },

    parentNode(this: LightningViewElement) {
      return this.parent;
    },

    nodeType(this: LightningViewElement) {
      return ELEMENT_NODE;
    },
  };

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
            writable: false,
          };

          return acc;
        }, {} as PropertyDescriptorMap),
      );

      Object.defineProperties(
        LightningViewElement.prototype,
        Object.entries(domAccessors).reduce((acc, [key, value]) => {
          acc[key] = {
            get: value,
            configurable: false,
            enumerable: false,
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

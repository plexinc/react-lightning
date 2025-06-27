import type {
  LightningElement,
  LightningElementStyle,
} from '@plextv/react-lightning';
import {
  UPDATE_HEIGHT,
  UPDATE_WIDTH,
  UPDATE_X,
  UPDATE_Y,
} from './types/UpdateFlags';
import type { YogaOptions } from './types/YogaOptions';
import yoga from './yoga';

const DEBOUNCE_DELAY = 1;

/**
 * Manages the lifecycle of Yoga nodes for Lightning elements. This can only be done on the main thread and not the worker thread.
 */
export class LightningManager {
  private _elements = new Map<number, LightningElement>();
  private _stylesToSend: Record<number, Partial<LightningElementStyle>> = {};
  private _needsRender: null | number = null;

  public async init(yogaOptions?: YogaOptions) {
    await yoga.load(yogaOptions);
    yoga.instance.on('render', this._applyUpdates);
  }

  public trackElement(element: LightningElement): void {
    if (this._elements.has(element.id)) {
      console.warn(`Yoga node is already attached to element #${element.id}.`);
      return;
    }

    this._elements.set(element.id, element);
    yoga.instance.addNode(element.id);

    const disposers = [
      element.on('destroy', async () => {
        for (const dispose of disposers) {
          dispose();
        }

        this._elements.delete(element.id);
        await yoga.instance.removeNode(element.id);
        this._render(element.id);
      }),

      element.on('childAdded', async (child, index) => {
        await yoga.instance.addChildNode(element.id, child.id, index);

        await this.applyStyle(element.id, element.props.style);
      }),

      element.on('childRemoved', async (child) => {
        await yoga.instance.removeNode(child.id);

        this._render(element.id);
      }),

      element.on('stylesChanged', async () => {
        await this.applyStyle(element.id, element.props.style);
      }),

      element.on('textureLoaded', async (node, event) => {
        // Text elements will already have its height and width set on the
        // node before loaded event is fired, so we need to set it on the yoga
        // node. If there's a maxWidth set, we should clamp the text to that size.
        // TODO: Get a proper return type
        const computedSize = await yoga.instance.getClampedSize(element.id);

        if (
          computedSize !== null &&
          computedSize > 0 &&
          event.dimensions.width > computedSize
        ) {
          node.contain = 'width';
          node.width = computedSize;
        }

        await this.applyStyle(element.id, {
          width: node.width,
          height: node.height,
        });

        this._render(element.id);
      }),
    ];
  }

  public async applyStyle(
    elementId: number,
    style?: Partial<LightningElementStyle> | null,
    skipRender = false,
  ) {
    if (!this._elements.has(elementId)) {
      return;
    }

    // if (style) {
    //   this._stylesToSend[elementId] = {
    //     ...this._stylesToSend[elementId],
    //     ...style,
    //   };
    // } else {
    //   delete this._stylesToSend[elementId];
    // }

    // if (!skipRender) {
    //   this._needsRender = elementId;
    // }

    if (style) {
      await yoga.instance.applyStyle(elementId, style);
    }

    if (!skipRender) {
      await this._render(elementId);
    }

    // return this._sendStyles();
  }

  private _sendStyles = debounced(async (): Promise<void> => {
    if (Object.keys(this._stylesToSend).length === 0) {
      return;
    }

    await yoga.instance.applyStyles(this._stylesToSend);
    this._stylesToSend = {};

    if (this._needsRender !== null) {
      await this._render(this._needsRender);
      this._needsRender = null;
    }
  }, DEBOUNCE_DELAY);

  private _applyUpdates = (buffer: ArrayBuffer) => {
    const dataView = new DataView(buffer);

    // See YogaManagerWorker.ts for the structure of the updates
    const numItems = dataView.getUint32(0);
    let offset = 4;

    for (let i = 0; i < numItems; i++) {
      const elementId = dataView.getUint32(offset);
      offset += 4;

      const el = this._elements.get(elementId);

      if (!el) {
        console.warn(`Element with ID ${elementId} not found.`);
        continue;
      }

      // Apply layout directly to the node to prevent re-rendering, and the
      // style retains the original value that was set.
      let skipX = false;
      let skipY = false;
      let dirty = false;

      if (el.parent?.style.display !== 'flex') {
        skipX =
          el.style.x !== undefined &&
          el.style.transform?.translateX === undefined;
        skipY =
          el.style.y !== undefined &&
          el.style.transform?.translateY === undefined;
      }

      const flags = dataView.getUint8(offset);
      offset += 1;

      if (flags & UPDATE_X) {
        if (!skipX) {
          dirty = el.setNodeProp('x', dataView.getInt16(offset)) || dirty;
        }

        offset += 2;
      }

      if (flags & UPDATE_Y) {
        if (!skipY) {
          dirty = el.setNodeProp('y', dataView.getInt16(offset)) || dirty;
        }

        offset += 2;
      }

      if (flags & UPDATE_WIDTH) {
        dirty = el.setNodeProp('width', dataView.getUint16(offset)) || dirty;
        offset += 2;
      }

      if (flags & UPDATE_HEIGHT) {
        dirty = el.setNodeProp('height', dataView.getUint16(offset)) || dirty;
        offset += 2;
      }

      if (dirty) {
        el.emitLayoutEvent();
      }
    }
  };

  private async _render(elementId: number) {
    yoga.instance.queueRender(elementId);
  }
}

function debounced<T extends (...args: unknown[]) => void | Promise<void>>(
  fn: T,
  delay: number,
): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: unknown[];

  const debouncedFn = function (this: unknown, ...args: unknown[]) {
    lastArgs = args;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      fn.apply(this, lastArgs);
    }, delay);
  };

  return debouncedFn as T;
}

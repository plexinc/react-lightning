import type {
  LightningElement,
  LightningElementStyle,
} from '@plextv/react-lightning';
import type { YogaOptions } from './types/YogaOptions';
import { SimpleDataView } from './util/SimpleDataView';
import yoga from './yoga';

/**
 * Manages the lifecycle of Yoga nodes for Lightning elements. This can only be
 * done on the main thread and not the worker thread.
 */
export class LightningManager {
  private _elements = new Map<number, LightningElement>();

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
        yoga.instance.removeNode(element.id);
      }),

      element.on('childAdded', async (child, index) => {
        yoga.instance.addChildNode(element.id, child.id, index);
        this.applyStyle(element.id, element.style);
      }),

      element.on('childRemoved', async (child) => {
        // This will remove any pending worker style updates that haven't been sent
        yoga.instance.applyStyle(child.id, null, true);
        yoga.instance.removeNode(child.id);
      }),

      element.on('stylesChanged', async () => {
        this.applyStyle(element.id, element.props.style);
      }),

      element.on('textureLoaded', async (node, event) => {
        // Text elements will already have its height and width set on the node
        // before loaded event is fired, so we need to set it on the yoga node.
        // If there's a maxWidth set, we should clamp the text to that size.
        // TODO: Get a proper return type
        if (element.isTextElement) {
          const computedSize = await yoga.instance.getClampedSize(element.id);

          if (
            computedSize !== null &&
            computedSize > 0 &&
            event.dimensions.width > computedSize
          ) {
            node.contain = 'width';
            node.width = computedSize;
          }
        }

        this.applyStyle(element.id, {
          width: node.width,
          height: node.height,
        });
      }),
    ];
  }

  public applyStyle(
    elementId: number,
    style?: Partial<LightningElementStyle> | null,
    skipRender = false,
  ) {
    if (!this._elements.has(elementId)) {
      return;
    }

    if (style) {
      yoga.instance.applyStyle(elementId, style, skipRender);
    }
  }

  private _applyUpdates = (buffer: ArrayBuffer) => {
    const dataView = new SimpleDataView(buffer);

    // See YogaManagerWorker.ts for the structure of the updates
    while (dataView.hasSpace(1)) {
      const elementId = dataView.readUint32();
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

      if (!skipX) {
        dirty = el.setNodeProp('x', dataView.readInt16()) || dirty;
      } else {
        // If the x is skipped, we still need to read the value to maintain the
        // correct offset in the data view.
        dataView.moveBy(2);
      }

      if (!skipY) {
        dirty = el.setNodeProp('y', dataView.readInt16()) || dirty;
      } else {
        // Same as above
        dataView.moveBy(2);
      }

      const width = dataView.readUint16();
      const height = dataView.readUint16();

      // If width is 0, we should not set it on the node, as it will cause
      // layout issues.
      if (width !== 0) {
        dirty = el.setNodeProp('width', width) || dirty;
      }

      if (height !== 0) {
        dirty = el.setNodeProp('height', height) || dirty;
      }

      if (dirty) {
        el.emitLayoutEvent();
      }
    }
  };
}

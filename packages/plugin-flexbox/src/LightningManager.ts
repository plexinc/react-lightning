import type {
  LightningElement,
  LightningElementStyle,
  LightningTextElement,
  RendererNode,
  TextRendererNode,
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
        yoga.instance.applyStyle(element.id, null, true);
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

      element.on(
        'textureLoaded',
        async (
          node:
            | RendererNode<LightningElement>
            | TextRendererNode<LightningTextElement>,
        ) => {
          this.applyStyle(element.id, {
            w: node.w,
            h: node.h,
          });
        },
      ),
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

    // See YogaManager.ts for the structure of the updates
    while (dataView.hasSpace(12)) {
      const elementId = dataView.readUint32();
      const x = dataView.readInt16();
      const y = dataView.readInt16();
      const width = dataView.readUint16();
      const height = dataView.readUint16();

      const el = this._elements.get(elementId);

      if (!el) {
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
        dirty = el.setNodeProp('x', x) || dirty;
      }

      if (!skipY) {
        dirty = el.setNodeProp('y', y) || dirty;
      }

      // If width is 0, we should not set it on the node, as it will cause
      // layout issues.
      if (width !== 0) {
        dirty = el.setNodeProp('w', width) || dirty;
      }

      if (height !== 0) {
        dirty = el.setNodeProp('h', height) || dirty;
      }

      if (dirty) {
        el.emitLayoutEvent();
      }
    }
  };
}

import type {
  LightningElement,
  LightningElementStyle,
  LightningTextElement,
  RendererNode,
  TextRendererNode,
} from '@plextv/react-lightning';
import type { YogaOptions } from './types/YogaOptions';
import { SimpleDataView } from './util/SimpleDataView';
import type { YogaManager } from './YogaManager';
import type { Workerized } from './YogaManagerWorker';
import loadYoga from './yoga';

/**
 * Manages the lifecycle of Yoga nodes for Lightning elements. This can only be
 * done on the main thread and not the worker thread.
 */
export class LightningManager {
  private _elements = new Map<number, LightningElement>();
  private _yogaManager: YogaManager | Workerized<YogaManager> | undefined;

  public async init(yogaOptions?: YogaOptions) {
    this._yogaManager = await loadYoga(yogaOptions);
    this._yogaManager.on('render', this._applyUpdates);
  }

  public trackElement(element: LightningElement): void {
    if (this._elements.has(element.id)) {
      console.warn(`Yoga node is already attached to element #${element.id}.`);
      return;
    }

    if (!this._yogaManager) {
      throw new Error(
        'YogaManager is not initialized. Make sure to call init() first.',
      );
    }

    this._elements.set(element.id, element);
    this._yogaManager.addNode(element.id);

    const disposers = [
      element.on('destroy', async () => {
        for (const dispose of disposers) {
          dispose();
        }

        this._elements.delete(element.id);
        // biome-ignore lint/style/noNonNullAssertion: Guaranteed to exist. But avoiding the nullish operator for perf reasons
        this._yogaManager!.applyStyle(element.id, null, true);
        // biome-ignore lint/style/noNonNullAssertion: Guaranteed to exist. See above
        this._yogaManager!.removeNode(element.id);
      }),

      element.on('childAdded', async (child, index) => {
        // biome-ignore lint/style/noNonNullAssertion: Guaranteed to exist. See above
        this._yogaManager!.addChildNode(element.id, child.id, index);
        this.applyStyle(element.id, element.style);
      }),

      element.on('childRemoved', async (child) => {
        // This will remove any pending worker style updates that haven't been sent

        // biome-ignore lint/style/noNonNullAssertion: Guaranteed to exist. See above
        this._yogaManager!.applyStyle(child.id, null, true);
        // biome-ignore lint/style/noNonNullAssertion: Guaranteed to exist. See above
        this._yogaManager!.removeNode(child.id);
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
          event: { type: string; dimensions: { w: number; h: number } },
        ) => {
          if (element.isTextElement) {
            this.applyStyle(element.id, {
              w: event.dimensions.w,
              h: event.dimensions.h,
            });
          } else {
            this.applyStyle(element.id, {
              w: node.w,
              h: node.h,
            });
          }
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
      // biome-ignore lint/style/noNonNullAssertion: Guaranteed to exist. See above
      this._yogaManager!.applyStyle(elementId, style, skipRender);
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

import type {
  LightningElement,
  LightningElementStyle,
  LightningTextElement,
  RendererNode,
  TextRendererNode,
} from '@plextv/react-lightning';

import type { YogaOptions } from './types/YogaOptions';
import loadYoga from './yoga';
import type { YogaManager } from './YogaManager';
import type { Workerized } from './YogaManagerWorker';

/** Lifecycle of Yoga nodes for Lightning elements. Main-thread only. */
export class LightningManager {
  private _elements = new Map<number, LightningElement>();
  private _boundaries = new Set<number>();
  private _flexRoots = new Set<number>();
  /** childId -> yoga-side parentId. Lets boundary/flex-root marking stay sync without a worker round-trip. */
  private _yogaParents = new Map<number, number>();
  /** Per-parent attached-children count. Lets `_yogaIndexFor` skip the O(n) sibling walk on append-at-end. */
  private _yogaChildCounts = new Map<number, number>();
  private _yogaManager: YogaManager | Workerized<YogaManager> | undefined;

  public async init(yogaOptions?: YogaOptions): Promise<void> {
    this._yogaManager = await loadYoga(yogaOptions);
    this._yogaManager.on('render', this._applyUpdates);
  }

  /**
   * Detaches the element's subtree from yoga (and excludes future
   * descendants). A nested {@link markFlexRoot} re-enables flex below it.
   * No-op outside a flex root since those elements are already excluded.
   */
  public markBoundary(element: LightningElement): () => void {
    if (this._boundaries.has(element.id)) {
      return () => this.unmarkBoundary(element.id);
    }

    this._boundaries.add(element.id);

    if (this._yogaManager) {
      for (const child of element.children) {
        if (this._yogaParents.get(child.id) === element.id) {
          this._yogaManager.detachChildNode(element.id, child.id);
          this._clearYogaParent(child.id, element.id);
        }
      }

      // Tree shape changed — re-layout any flex roots that contain it.
      this._yogaManager.queueRender(element.id);
    }

    return () => this.unmarkBoundary(element.id);
  }

  public unmarkBoundary(elementId: number): void {
    this._boundaries.delete(elementId);
  }

  /**
   * Opts an element and its subtree into flex layout as an independent
   * yoga root. Flex is opt-in — without a flex root above it, an element
   * is invisible to yoga.
   */
  public markFlexRoot(element: LightningElement): () => void {
    if (this._flexRoots.has(element.id)) {
      return () => this.unmarkFlexRoot(element.id);
    }

    this._flexRoots.add(element.id);

    if (this._yogaManager) {
      const yogaParent = this._yogaParents.get(element.id);

      if (yogaParent !== undefined) {
        this._yogaManager.detachChildNode(yogaParent, element.id);
        this._clearYogaParent(element.id, yogaParent);
      }

      this._yogaManager.addIndependentRoot(element.id);

      this._reattachChildren(element);

      // First layout pass — without this the root sits at 0,0 until
      // something else calls applyStyle.
      this._yogaManager.queueRender(element.id);
    }

    return () => this.unmarkFlexRoot(element.id);
  }

  public unmarkFlexRoot(elementId: number): void {
    this._flexRoots.delete(elementId);
    this._yogaManager?.removeIndependentRoot(elementId);
  }

  /** True when the element should NOT participate in yoga (no flex root ancestor, or a boundary intervenes). */
  private _isInBoundary(parent: LightningElement): boolean {
    let curr: LightningElement | null = parent;

    while (curr) {
      if (this._flexRoots.has(curr.id)) {
        return false;
      }

      if (this._boundaries.has(curr.id)) {
        return true;
      }

      curr = curr.parent;
    }

    return true;
  }

  /**
   * Yoga-side index for inserting at React's `reactIndex`, accounting for
   * skipped siblings (boundaries, flex roots). Append-at-end fast path
   * uses the cached count — turns O(N²) mass-mount into O(N).
   */
  private _yogaIndexFor(parent: LightningElement, reactIndex: number): number {
    if (reactIndex === parent.children.length - 1) {
      return this._yogaChildCounts.get(parent.id) ?? 0;
    }

    let yogaIndex = 0;

    for (let i = 0; i < reactIndex; i++) {
      const sibling = parent.children[i];

      if (sibling && this._yogaParents.get(sibling.id) === parent.id) {
        yogaIndex++;
      }
    }

    return yogaIndex;
  }

  /** Maintains `_yogaParents` and `_yogaChildCounts` together so the fast path stays accurate. */
  private _setYogaParent(childId: number, parentId: number): void {
    this._yogaParents.set(childId, parentId);
    this._yogaChildCounts.set(parentId, (this._yogaChildCounts.get(parentId) ?? 0) + 1);
  }

  /** Counterpart of `_setYogaParent`. `parentId` passed explicitly since `_yogaParents.get` may already be cleared. */
  private _clearYogaParent(childId: number, parentId: number): void {
    this._yogaParents.delete(childId);

    const count = this._yogaChildCounts.get(parentId);

    if (count !== undefined && count > 0) {
      this._yogaChildCounts.set(parentId, count - 1);
    }
  }

  private _reattachChildren(parent: LightningElement): void {
    if (!this._yogaManager) {
      return;
    }

    let yogaIndex = 0;

    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];

      if (!child) {
        continue;
      }

      if (this._flexRoots.has(child.id)) {
        // Independent yoga root — does not count toward parent's yoga children
        continue;
      }

      const currentParent = this._yogaParents.get(child.id);

      if (currentParent === parent.id) {
        yogaIndex++;

        if (!this._boundaries.has(child.id)) {
          this._reattachChildren(child);
        }

        continue;
      }

      if (currentParent !== undefined) {
        this._yogaManager.detachChildNode(currentParent, child.id);
        this._clearYogaParent(child.id, currentParent);
      }

      this._yogaManager.addChildNode(parent.id, child.id, yogaIndex);
      this._setYogaParent(child.id, parent.id);
      yogaIndex++;

      if (!this._boundaries.has(child.id)) {
        this._reattachChildren(child);
      }
    }
  }

  public trackElement(element: LightningElement): void {
    if (this._elements.has(element.id)) {
      console.warn(`Yoga node is already attached to element #${element.id}.`);

      return;
    }

    if (!this._yogaManager) {
      throw new Error('YogaManager is not initialized. Make sure to call init() first.');
    }

    this._elements.set(element.id, element);
    this._yogaManager.addNode(element.id);

    const disposers = [
      element.on('destroy', () => {
        for (const dispose of disposers) {
          dispose();
        }

        const yogaParent = this._yogaParents.get(element.id);

        if (yogaParent !== undefined) {
          this._clearYogaParent(element.id, yogaParent);
        }

        this._elements.delete(element.id);
        this._boundaries.delete(element.id);
        this._flexRoots.delete(element.id);
        this._yogaChildCounts.delete(element.id);
        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. But avoiding the nullish operator for perf reasons
        this._yogaManager!.applyStyle(element.id, null, true);
        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
        this._yogaManager!.removeIndependentRoot(element.id);
        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
        this._yogaManager!.removeNode(element.id);
      }),

      element.on('childAdded', (child, index) => {
        if (this._isInBoundary(element)) {
          return;
        }

        // Translate React index → yoga index. Skipped siblings (boundaries,
        // flex roots) cause "memory access out of bounds" otherwise.
        const yogaIndex = this._yogaIndexFor(element, index);

        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
        this._yogaManager!.addChildNode(element.id, child.id, yogaIndex);
        this._setYogaParent(child.id, element.id);
        this.applyStyle(element.id, element.style);

        // React mounts bottom-up: `child`'s descendants were inserted
        // before `child` joined the flex tree, so they were skipped at
        // their own childAdded time. Promote them now.
        if (!this._boundaries.has(child.id)) {
          this._reattachChildren(child);
        }
      }),

      element.on('childRemoved', (child) => {
        const childYogaParent = this._yogaParents.get(child.id);

        if (childYogaParent !== undefined) {
          this._clearYogaParent(child.id, childYogaParent);
        }

        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
        this._yogaManager!.applyStyle(child.id, null, true);
        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
        this._yogaManager!.removeNode(child.id);

        // Re-layout — without this a shrink-fit parent keeps the old size
        // (node.w/h stay at last computed) and NodeResizeObserver never
        // fires the shrink event to consumers like VL.reportItemSize.
        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
        this._yogaManager!.queueRender(element.id);
      }),

      element.on('inViewport', () => {
        if (!element.isTextElement && !element.isImageElement) {
          this.applyStyle(element.id, element.props.style);
        }
      }),

      element.on('stylesChanged', () => {
        this.applyStyle(element.id, element.props.style);
      }),

      element.on(
        'textureLoaded',
        (
          node: RendererNode<LightningElement> | TextRendererNode<LightningTextElement>,
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
  ): void {
    if (!this._elements.has(elementId)) {
      return;
    }

    if (style) {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
      this._yogaManager!.applyStyle(elementId, style, skipRender);
    }
  }

  private _applyUpdates = (buffer: ArrayBuffer) => {
    // Raw `DataView` over `SimpleDataView` — this is a per-frame hot path
    // that doesn't need overflow handling or write tracking.
    const view = new DataView(buffer);
    const length = buffer.byteLength;
    let offset = 0;

    // See YogaManager.ts for the structure of the updates (12 bytes/entry)
    while (offset + 12 <= length) {
      const elementId = view.getUint32(offset, true);
      const x = view.getInt16(offset + 4, true);
      const y = view.getInt16(offset + 6, true);
      const width = view.getUint16(offset + 8, true);
      const height = view.getUint16(offset + 10, true);
      offset += 12;

      const el = this._elements.get(elementId);

      if (!el) {
        continue;
      }

      // Apply directly to the node so style retains its original value.
      let skipX = false;
      let skipY = false;
      let dirty = false;
      let resize = false;

      const isText = el.isTextElement;

      if (el.parent?.style.display !== 'flex') {
        skipX =
          el.style.x !== undefined &&
          el.rawProps.style?.x !== undefined &&
          el.style.transform?.translateX === undefined;
        skipY =
          el.style.y !== undefined &&
          el.rawProps.style?.y !== undefined &&
          el.style.transform?.translateY === undefined;
      }

      if (!skipX) {
        dirty = el.setNodeProp('x', x) || dirty;
      }

      if (!skipY) {
        dirty = el.setNodeProp('y', y) || dirty;
      }

      // Skip zero (causes layout issues) and text elements (Lightning sizes them).
      if (width !== 0 && !isText) {
        dirty = el.setNodeProp('w', width) || dirty;
        resize = true;
      }

      if (height !== 0 && !isText) {
        dirty = el.setNodeProp('h', height) || dirty;
        resize = true;
      }

      if (resize) {
        el.emit('resized', el, { w: width, h: height });
      }

      if (dirty || !el.hasLayout) {
        el.emitLayoutEvent();
      }
    }
  };
}

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

/**
 * Manages the lifecycle of Yoga nodes for Lightning elements. This can only be
 * done on the main thread and not the worker thread.
 */
export class LightningManager {
  private _elements = new Map<number, LightningElement>();
  private _boundaries = new Set<number>();
  private _flexRoots = new Set<number>();
  /**
   * Tracks the yoga-side parent for every attached node (childId -> parentId).
   * Used to make boundary/flex-root marking idempotent without a sync round-trip
   * to a worker.
   */
  private _yogaParents = new Map<number, number>();
  /**
   * Per-parent count of children currently attached in yoga. Lets
   * `_yogaIndexFor` short-circuit the O(n) sibling walk for the common
   * append-at-end case (the new child's yoga index equals the parent's
   * current attached count). Maintained alongside `_yogaParents`: any
   * change to a child's yoga parent updates the old parent's count down
   * and the new parent's count up.
   */
  private _yogaChildCounts = new Map<number, number>();
  private _yogaManager: YogaManager | Workerized<YogaManager> | undefined;

  public async init(yogaOptions?: YogaOptions): Promise<void> {
    this._yogaManager = await loadYoga(yogaOptions);
    this._yogaManager.on('render', this._applyUpdates);
  }

  /**
   * Marks an element as a flex boundary inside a flex tree. Its existing
   * children are detached from yoga and any future children added to its
   * subtree are not added to yoga either. A nested {@link markFlexRoot}
   * restores yoga participation for everything below it.
   *
   * Note: flex is opt-in, so calling this outside a {@link markFlexRoot}
   * subtree is a no-op — those elements are already excluded from yoga.
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
   * Opts an element and its subtree into flex layout. The element becomes an
   * independent yoga root — its subtree is laid out on its own each render,
   * separately from any other flex tree.
   *
   * Flex is opt-in for this plugin. Without a flex root somewhere above an
   * element, that element is invisible to yoga and gets no flex behavior.
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

      // Trigger the first layout pass for the freshly-attached subtree.
      // Without this, the new independent root sits with default 0,0 sizes
      // until something else happens to call applyStyle.
      this._yogaManager.queueRender(element.id);
    }

    return () => this.unmarkFlexRoot(element.id);
  }

  public unmarkFlexRoot(elementId: number): void {
    this._flexRoots.delete(elementId);
    this._yogaManager?.removeIndependentRoot(elementId);
  }

  /**
   * Returns true when an element should NOT participate in yoga layout. Flex
   * is opt-in: an element is in flex only when it has an ancestor (or is one)
   * marked as a {@link markFlexRoot}. A nested {@link markBoundary} between
   * the element and that flex root re-disables flex for the subtree.
   */
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
   * Counts how many preceding React siblings of `parent` are currently
   * attached to `parent` in yoga. The result is the yoga-side index at which
   * a child should be inserted to preserve relative order with React.
   *
   * Fast path: when the new child is being appended at the end of
   * `parent.children` (the common case for React mounts and most list
   * additions), the yoga-side index is exactly the parent's current
   * attached-children count — no sibling walk needed. This turns the
   * O(N²) cost of mass-mounting a list into O(N).
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

  /**
   * Marks `childId` as yoga-attached to `parentId`. Updates `_yogaParents`
   * AND `_yogaChildCounts` together so `_yogaIndexFor`'s fast path stays
   * accurate.
   */
  private _setYogaParent(childId: number, parentId: number): void {
    this._yogaParents.set(childId, parentId);
    this._yogaChildCounts.set(parentId, (this._yogaChildCounts.get(parentId) ?? 0) + 1);
  }

  /**
   * Records that `childId` is no longer yoga-attached to `parentId`.
   * Symmetric counterpart of `_setYogaParent`. The `parentId` argument is
   * required because at call time `_yogaParents.get(childId)` may have
   * already been deleted.
   */
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

        // Translate the React-side index to a yoga-side index by counting
        // preceding siblings that are actually attached to this parent in
        // yoga. Without this, skipped siblings (nested boundaries, flex
        // roots) cause yoga's insertChild to walk off the end of its
        // children array — which surfaces as "memory access out of bounds".
        const yogaIndex = this._yogaIndexFor(element, index);

        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
        this._yogaManager!.addChildNode(element.id, child.id, yogaIndex);
        this._setYogaParent(child.id, element.id);
        this.applyStyle(element.id, element.style);

        // React mounts bottom-up: `child` may already have its own subtree
        // that was inserted before `child` itself joined the flex tree. Those
        // descendants were skipped at their own childAdded time (no flex
        // ancestor existed then). Promote them now.
        if (!this._boundaries.has(child.id)) {
          this._reattachChildren(child);
        }
      }),

      element.on('childRemoved', (child) => {
        // This will remove any pending worker style updates that haven't been sent

        const childYogaParent = this._yogaParents.get(child.id);

        if (childYogaParent !== undefined) {
          this._clearYogaParent(child.id, childYogaParent);
        }

        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
        this._yogaManager!.applyStyle(child.id, null, true);
        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
        this._yogaManager!.removeNode(child.id);

        // Schedule a yoga re-layout. Without this, a parent that shrink-fits
        // its children (no explicit w/h) keeps the old size when a child is
        // removed — its node.w/h stay at the last computed values, and
        // NodeResizeObserver never fires the shrink event up to consumers
        // (e.g., VirtualList's reportItemSize).
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
    // Raw `DataView` instead of `SimpleDataView` here — this is a pure
    // read loop fired per render frame, and `SimpleDataView` adds an
    // outer object plus a layer of `_readInt` indirection that's pure
    // overhead when we don't need overflow handling, write tracking, or
    // auto-incrementing offsets across method calls. Manual offset
    // arithmetic is the cheapest option for a hot per-frame path.
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

      // Apply layout directly to the node to prevent re-rendering, and the
      // style retains the original value that was set.
      let skipX = false;
      let skipY = false;
      let dirty = false;
      let resize = false;

      // `isTextElement` is a getter — cache once, read twice below.
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

      // If width is 0, we should not set it on the node, as it will cause
      // layout issues. We also ignore setting width/height for text elements,
      // as their size is handled by lightning.
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

import type {
  LightningElement,
  LightningElementStyle,
  LightningTextElement,
  LightningTextElementStyle,
  RendererNode,
  TextRendererNode,
} from '@plextv/react-lightning';

import type { TextMeasureProps } from './text/layoutText';
import type { YogaOptions } from './types/YogaOptions';
import loadYoga from './yoga';
import type { YogaManager } from './YogaManager';
import type { Workerized } from './YogaManagerWorker';

// Sub-glyph slack added to a measured text node's rendered contain width so the
// renderer doesn't clip the final glyph(s) when our measurement lands a hair
// under its own. Far below one glyph, so it never affects wrapping.
const TEXT_CONTAIN_EPSILON = 2;

/** Lifecycle of Yoga nodes for Lightning elements. Main-thread only. */
export class LightningManager {
  private _elements = new Map<number, LightningElement>();
  private _boundaries = new Set<number>();
  private _flexRoots = new Set<number>();
  /** childId -> yoga-side parentId. Lets boundary/flex-root marking stay sync without a worker round-trip. */
  private _yogaParents = new Map<number, number>();
  /** Per-parent attached-children count. Lets `_yogaIndexFor` skip the O(n) sibling walk on append-at-end. */
  private _yogaChildCounts = new Map<number, number>();
  /** Text elements measured by Yoga — their node w/h/contain come from layout, not the async texture. */
  private _measuredText = new Set<number>();
  /**
   * Per measured-text element, the widest parent node width it has been measured
   * against. Yoga caches measure results and won't re-call the measure func when
   * a text node's container resolves to a wider width after an early narrow
   * measure. When the container grows past this we re-dirty the text so it
   * re-measures at the real width (see the grow-only re-dirty in `_applyUpdates`).
   */
  private _textContextWidth = new Map<number, number>();
  private _yogaManager: YogaManager | Workerized<YogaManager> | undefined;

  /**
   * Font families we have metrics for and can measure. Only text in one of
   * these is measured by Yoga; everything else (e.g. the canvas `plex-icons`
   * glyph font) falls back to the renderer's own sizing.
   */
  private _measurableFonts = new Set<string>();

  public async init(yogaOptions?: YogaOptions): Promise<void> {
    this._measurableFonts = new Set((yogaOptions?.fonts ?? []).map((font) => font.fontFamily));
    this._yogaManager = await loadYoga(yogaOptions);
    this._yogaManager.on('render', this._applyUpdates);
  }

  /**
   * Subscribe to Yoga's `settled` event (layout converged to a fixpoint).
   * Main-thread only — the worker proxy never emits it, so the callback
   * simply never fires there and callers fall back to their timers.
   */
  public onSettled(callback: () => void): () => void {
    const manager = this._yogaManager;

    if (!manager) {
      return () => {};
    }

    manager.on('settled', callback);

    return () => manager.off('settled', callback);
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

      // The boundary's descendants no longer get a layout (until a nested flex
      // root re-opts them in), so any that were withheld waiting for a first
      // layout would never be revealed. Release them now.
      for (let i = 0; i < element.children.length; i++) {
        this._releaseWithheldSubtree(element.children[i]);
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

      // A definite-sized root paints at its origin until its first layout
      // resolves — withhold paint until then. No-op for 0x0 roots.
      element.withholdPaintUntilLayout();

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
      // Hide a definite-sized node until its first layout positions it, so it
      // doesn't paint at its pre-layout origin while the (async) layout is in
      // flight. No-op for 0x0 nodes — the common case.
      child.withholdPaintUntilLayout();
      yogaIndex++;

      if (!this._boundaries.has(child.id)) {
        this._reattachChildren(child);
      }
    }
  }

  /** Recursively reveal any withheld nodes in a subtree that has been detached
   * from flex layout (and so would never receive the first layout that reveals
   * them). Stops at nested flex roots, whose subtrees stay in layout. */
  private _releaseWithheldSubtree(element: LightningElement | undefined): void {
    if (!element || this._flexRoots.has(element.id)) {
      return;
    }

    element.releaseWithheldPaint();

    for (let i = 0; i < element.children.length; i++) {
      this._releaseWithheldSubtree(element.children[i]);
    }
  }

  /**
   * Push a text element's content + font props to Yoga so it can measure the
   * text during layout. Only text in a font we have metrics for is measured;
   * anything else (no family, or a non-measurable font like the canvas
   * `plex-icons` glyph font) is left to the renderer's own sizing.
   */
  private _syncTextMeasure(element: LightningElement): void {
    if (!this._yogaManager) {
      return;
    }

    const style = (element.style ?? {}) as Partial<LightningTextElementStyle>;
    const fontFamily = style.fontFamily;

    if (!fontFamily || !this._measurableFonts.has(fontFamily)) {
      if (this._measuredText.delete(element.id)) {
        this._textContextWidth.delete(element.id);
        this._yogaManager.clearTextMeasure(element.id);
      }

      return;
    }

    this._measuredText.add(element.id);
    this._yogaManager.setTextMeasure(element.id, fontFamily, {
      text: (element as LightningTextElement).text ?? '',
      fontSize: style.fontSize || 16,
      letterSpacing: style.letterSpacing || 0,
      // 0 / undefined lineHeight → natural (1× metrics); a value > 3 is px.
      lineHeight: style.lineHeight || 1,
      maxLines: style.maxLines || 0,
      maxHeight: style.maxHeight || 0,
      wordBreak: (style.wordBreak as TextMeasureProps['wordBreak']) || 'break-word',
      overflowSuffix: style.overflowSuffix ?? '...',
    });
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

    // Set text measurement before any children mount, so the Yoga node is a
    // leaf when its measure func is installed (Yoga requires that).
    if (element.isTextElement) {
      this._syncTextMeasure(element);
    }

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
        this._measuredText.delete(element.id);
        this._textContextWidth.delete(element.id);
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
        // See _reattachChildren — withhold paint until first layout.
        child.withholdPaintUntilLayout();
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

      // Same-parent reorder (React's keyed move). Reindex in place, keep the yoga node alive.
      element.on('childMoved', (child, _fromIndex, toIndex) => {
        if (this._yogaParents.get(child.id) !== element.id) {
          // Not one of this parent's yoga children (boundary or flex root), nothing to reindex.
          return;
        }

        // Detach before computing the index: the append-at-end fast path in
        // _yogaIndexFor reads the cached count, which must not include the child.
        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
        this._yogaManager!.detachChildNode(element.id, child.id);
        this._clearYogaParent(child.id, element.id);

        const yogaIndex = this._yogaIndexFor(element, toIndex);

        // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
        this._yogaManager!.addChildNode(element.id, child.id, yogaIndex);
        this._setYogaParent(child.id, element.id);
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

        // Font/size/maxLines changes affect measurement.
        if (element.isTextElement) {
          this._syncTextMeasure(element);
        }
      }),

      element.on(
        'textureLoaded',
        (
          node: RendererNode<LightningElement> | TextRendererNode<LightningTextElement>,
          event: { type: string; dimensions: { w: number; h: number } },
        ) => {
          if (element.isTextElement) {
            // Static text (set once at mount via the initial-props path, not the
            // `text` setter) never fires `textChanged`, so `_syncTextMeasure`
            // only ran at trackElement before the content existed and the node
            // was never measured. The renderer's texture-loaded event is the
            // first point where `node.text` is reliably populated — sync now so
            // such text gets a measure func and wraps like dynamic text does.
            if (!this._measuredText.has(element.id)) {
              this._syncTextMeasure(element);
            }

            // When Yoga measures the text itself, it owns the node's size —
            // pushing the async texture size back would fight the measure func.
            if (this._measuredText.has(element.id)) {
              return;
            }

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

    // Re-measure when text content changes. `propsChanged` covers the setProps
    // path; `textChanged` covers value changes that bypass it — recycled nodes
    // (commitTextUpdate) and folded fragment text (recomputeChildText) — which
    // is the common case for reused preview/hero nodes.
    if (element.isTextElement) {
      disposers.push(
        element.on('propsChanged', () => {
          this._syncTextMeasure(element);
        }),
        element.on('textChanged', () => {
          this._syncTextMeasure(element);
        }),
      );
    }
  }

  public applyStyle(
    elementId: number,
    style?: Partial<LightningElementStyle> | null,
    skipRender = false,
    resetMissing = false,
  ): void {
    if (!this._elements.has(elementId)) {
      return;
    }

    if (style) {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- Guaranteed to exist. See above
      this._yogaManager!.applyStyle(elementId, style, skipRender, resetMissing);
    }
  }

  private _applyUpdates = (buffer: ArrayBuffer) => {
    // Raw `DataView` over `SimpleDataView` — this is a per-frame hot path
    // that doesn't need overflow handling or write tracking.
    const view = new DataView(buffer);
    const length = buffer.byteLength;
    let offset = 0;

    // See YogaManager.ts for the structure of the updates (20 bytes/entry)
    while (offset + 20 <= length) {
      const elementId = view.getUint32(offset, true);
      const x = view.getInt32(offset + 4, true);
      const y = view.getInt32(offset + 8, true);
      const width = view.getInt32(offset + 12, true);
      const height = view.getInt32(offset + 16, true);
      offset += 20;

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

      // Normally text elements are sized by Lightning (async texture measure),
      // so we skip them here. But when Yoga measures the text itself, its
      // computed size IS the text box: apply it and pin contain:'width' so the
      // renderer wraps to the same width and textAlign has a box to align in.
      const isMeasuredText = isText && this._measuredText.has(elementId);

      if (width !== 0 && (!isText || isMeasuredText)) {
        if (isMeasuredText) {
          // `contain` lives on the text node, not the base node type — set it
          // directly. Wrapping/textAlign only take effect with a contained width.
          const textNode = el.node as TextRendererNode<LightningTextElement>;

          if (textNode.contain !== 'width') {
            textNode.contain = 'width';
          }

          // Pin the renderer's text box a hair wider than the Yoga-measured
          // width. Our msdf measurement can land a sub-pixel under the
          // renderer's own glyph layout; containing to the exact width would
          // clip the final glyphs (e.g. "Sign Up" → "Sign…"). The epsilon is
          // far below a glyph, so it never changes wrapping, and Yoga still
          // positions siblings from its own (un-padded) computed width.
          dirty = el.setNodeProp('w', width + TEXT_CONTAIN_EPSILON) || dirty;
        } else {
          dirty = el.setNodeProp('w', width) || dirty;
        }

        resize = true;
      }

      if (height !== 0 && (!isText || isMeasuredText)) {
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

    // Yoga caches text measurements and won't re-run the measure func when a
    // container resolves to its real (wider) width after an early too-narrow
    // measure — leaving text stuck narrow (the classic collapsed-then-expanded
    // hero title). After each layout, if a measured text node's container has
    // GROWN past the width it was last measured against, re-dirty it so Yoga
    // re-measures at the now-available width.
    //
    // Grow-only is deliberate. The container width is often *derived* from the
    // text itself (a shrink-to-content wrapper) or from a sibling whose size
    // toggles (e.g. ClearLogo's logo image vs. its text fallback). Re-measuring
    // on every change — including shrink — feeds that derived width back into
    // the measure and oscillates (the same title flip-flopping between e.g. 686
    // and 462). Reacting only to growth converges (the recorded width climbs
    // monotonically until it matches the settled container) and biases toward
    // the widest the container ever offered, which never clips. New text on a
    // recycled node is handled separately by the `textChanged` → setTextMeasure
    // measure-func reinstall, so a narrower reuse still re-measures correctly.
    if (this._measuredText.size > 0) {
      for (const textId of this._measuredText) {
        const textEl = this._elements.get(textId);

        if (!textEl) {
          continue;
        }

        const contextWidth = textEl.parent?.node.w ?? 0;

        if (contextWidth > (this._textContextWidth.get(textId) ?? 0)) {
          this._textContextWidth.set(textId, contextWidth);
          this._syncTextMeasure(textEl);
        }
      }
    }
  };
}

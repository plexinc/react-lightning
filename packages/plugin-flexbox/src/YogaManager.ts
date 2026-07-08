import { EventEmitter } from 'tseep';
import { type Config, loadYoga, type Yoga } from 'yoga-layout/load';

import type { LightningElementStyle, Rect } from '@plextv/react-lightning';

import { FontMetricsStore } from './text/FontMetricsStore';
import { layoutText, type TextMeasureProps } from './text/layoutText';
import type { ManagerNode } from './types/ManagerNode';
import type { YogaOptions } from './types/YogaOptions';
import applyReactPropsToYoga, { applyFlexPropToYoga } from './util/applyReactPropsToYoga';
import { SimpleDataView } from './util/SimpleDataView';

export type BatchedUpdate = Record<number, Partial<Rect>>;

export type YogaManagerEvents = {
  // Updates are sent in an array. This is because when working with web
  // workers, it's more efficient to transfer an array instead of serializing
  // values and sending them over postMessage. The first 32 unsigned bits of the
  // array are reserved for the number of elements being updated. The rest of the
  // array contains the updates for each element. The data structure is as follows:
  //   uint32 - The element ID of the element being updated
  //   int16 - The x coordinate of the element
  //   int16 - The y coordinate of the element
  //   int16 - The width of the element
  //   int16 - The height of the element
  render: (updates: ArrayBuffer) => void;
};

// elementId + x + y + width + height, as per spec above
const APPROX_SIZEOF_UPDATE = 4 + 2 + 2 + 2 + 2;
// 10KB, should be enough for most updates. If it's bigger than this, we'll chunk the updates
const MAX_SIZEOF_UPDATE = 1024 * 10;

export class YogaManager {
  private _elementMap: Map<number, ManagerNode> = new Map();
  private _hiddenElements: Set<number> = new Set();
  private _independentRoots: Set<ManagerNode> = new Set();
  private _yoga?: Yoga;
  private _config?: Config;
  private _initialized = false;
  private _isRenderQueued = false;
  private _yogaOptions: Required<YogaOptions> = {
    useWebDefaults: false,
    errata: 'none',
    processHiddenNodes: false,
    useWebWorker: false,
    expandToAutoFlexBasis: false,
    fonts: [],
  };
  private _eventEmitter: EventEmitter<YogaManagerEvents> = new EventEmitter();
  private _dataView: SimpleDataView;
  private _fontStore = new FontMetricsStore();
  // Text leaves currently measured by Yoga, so we can re-dirty them when a
  // font finishes loading.
  private _textNodes: Set<number> = new Set();

  public on: EventEmitter<YogaManagerEvents>['on'] = this._eventEmitter.on.bind(this._eventEmitter);
  public off: EventEmitter<YogaManagerEvents>['off'] = this._eventEmitter.off.bind(
    this._eventEmitter,
  );

  public get initialized(): boolean {
    return this._initialized;
  }

  public constructor() {
    this._dataView = new SimpleDataView(MAX_SIZEOF_UPDATE, true, this._flushArrayBuffer);
  }

  public async init(yogaOptions?: YogaOptions): Promise<void> {
    Object.assign(this._yogaOptions, yogaOptions);

    this._yoga = await loadYoga();
    this._config = this._yoga.Config.create();
    this._config.setUseWebDefaults(this._yogaOptions.useWebDefaults);

    switch (this._yogaOptions.errata) {
      case 'all':
        this._config.setErrata(this._yoga.ERRATA_ALL);
        break;
      case 'classic':
        this._config.setErrata(this._yoga.ERRATA_CLASSIC);
        break;
      case 'stretch-flex-basis':
        this._config.setErrata(this._yoga.ERRATA_STRETCH_FLEX_BASIS);
        break;
      case 'absolute-percent-against-inner':
        this._config.setErrata(this._yoga.ERRATA_ABSOLUTE_PERCENT_AGAINST_INNER_SIZE);
        break;
      case 'absolute-position-without-insets':
        this._config.setErrata(this._yoga.ERRATA_ABSOLUTE_POSITION_WITHOUT_INSETS_EXCLUDES_PADDING);
        break;
      default:
        this._config.setErrata(this._yoga.ERRATA_NONE);
        break;
    }

    this._initialized = true;

    // Load fonts in the background; don't block init. As each arrives, re-dirty
    // any text already laid out with it so its measurement updates.
    if (this._yogaOptions.fonts) {
      for (const font of this._yogaOptions.fonts) {
        void this._fontStore.load(font.fontFamily, font.atlasDataUrl).then(() => {
          this._remeasureFontFamily(font.fontFamily);
        });
      }
    }
  }

  /**
   * Set (or refresh) synchronous text measurement for a node. Installs a Yoga
   * measure function the first time so wrapping/sizing happen during layout.
   */
  public setTextMeasure(elementId: number, fontFamily: string, props: TextMeasureProps): void {
    const yogaNode = this._elementMap.get(elementId);

    if (!yogaNode) {
      return;
    }

    const isFirst = yogaNode.text === undefined;
    yogaNode.text = { fontFamily, props };

    if (isFirst) {
      // A measured leaf can't have children. If any were added before this
      // node became text (e.g. the font/family arrived after children
      // mounted), detach them — text fragment children aren't layout nodes.
      for (const child of yogaNode.children) {
        yogaNode.node.removeChild(child.node);
        child.parent = undefined;
      }
      yogaNode.children.length = 0;

      this._textNodes.add(elementId);
    }

    // Clear any explicit width/height so the measure func is the sole source of
    // this node's size. The renderer measures text asynchronously and pushes
    // its texture dimensions back as an explicit `w`/`h` (see the
    // `textureLoaded` handler) — if that ran before the node became measured
    // text, Yoga sees a DEFINITE width and never calls the measure func, so the
    // node keeps the renderer's (often container-clipped) size. Resetting to
    // auto makes Yoga measure it. Done every call so a recycled node that
    // briefly went through the texture path is corrected too.
    yogaNode.node.setWidthAuto();
    yogaNode.node.setHeightAuto();

    // (Re)install the measure func every time. Re-setting it busts Yoga's
    // cached measurement, which `markDirty` alone does not reliably do for a
    // recycled node whose available width is unchanged — so changed text never
    // re-measured and kept its stale width.
    yogaNode.node.setMeasureFunc((width, widthMode) =>
      this._measureText(elementId, width, widthMode),
    );

    yogaNode.node.markDirty();
    this.queueRender(elementId);
  }

  /** Remove text measurement from a node (e.g. it's no longer a text leaf). */
  public clearTextMeasure(elementId: number): void {
    const yogaNode = this._elementMap.get(elementId);

    this._textNodes.delete(elementId);

    if (yogaNode?.text !== undefined) {
      yogaNode.text = undefined;
      yogaNode.node.setMeasureFunc(null);
      this.queueRender(elementId);
    }
  }

  // widthMode is Yoga's MeasureMode: 0 = Undefined (unconstrained), 1 = Exactly,
  // 2 = AtMost. Only a bounded width should wrap the text.
  private _measureText(
    elementId: number,
    availableWidth: number,
    widthMode: number,
  ): { width: number; height: number } {
    const text = this._elementMap.get(elementId)?.text;

    if (text === undefined) {
      return { width: 0, height: 0 };
    }

    const font = this._fontStore.get(text.fontFamily);

    if (font === undefined) {
      // Font not loaded yet — measure empty; _remeasureFontFamily re-dirties
      // this node once it arrives.
      return { width: 0, height: 0 };
    }

    const maxWidth =
      widthMode === 0 || !Number.isFinite(availableWidth) ? Infinity : availableWidth;

    return layoutText(font, text.props, maxWidth);
  }

  private _remeasureFontFamily(fontFamily: string): void {
    let dirtied = false;

    for (const elementId of this._textNodes) {
      const yogaNode = this._elementMap.get(elementId);

      if (yogaNode?.text?.fontFamily === fontFamily) {
        yogaNode.node.markDirty();
        dirtied = true;
      }
    }

    if (dirtied) {
      // Force a relayout pass so the newly-measurable text resizes.
      this.queueRender(0, true);
    }
  }

  public addNode(elementId: number): ManagerNode {
    if (this._elementMap.has(elementId)) {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- Already checked
      return this._elementMap.get(elementId)!;
    }

    const node = this._createNode(elementId);

    this._elementMap.set(elementId, node);

    return node;
  }

  public removeNode(elementId: number): void {
    this._textNodes.delete(elementId);

    const yogaNode = this._elementMap.get(elementId);

    if (yogaNode) {
      // Detach from the parent's yoga node before freeing. Splicing only the
      // ManagerNode children array leaves the freed child in the parent's yoga
      // child list, so the parent keeps laying it out and a shrink-fit parent
      // never shrinks back.
      if (yogaNode.parent) {
        const index = yogaNode.parent.children.indexOf(yogaNode);

        if (index !== -1) {
          yogaNode.parent.children.splice(index, 1);
        }

        // Only detach while the parent is still alive. React tears subtrees
        // down root-first, so a descendant's parent can already be freed by
        // the time we get here; removeChild on a freed node corrupts yoga's
        // heap (surfaces as a re-mounted subtree that never lays out).
        if (this._elementMap.has(yogaNode.parent.id)) {
          yogaNode.parent.node.removeChild(yogaNode.node);
        }
      }

      yogaNode.node.free();

      this._elementMap.delete(elementId);
    }
  }

  public addChildNode(parentId: number, childId: number, index?: number): void {
    const parentYogaNode = this._elementMap.get(parentId);
    const childYogaNode = this._elementMap.get(childId);

    if (!parentYogaNode || !childYogaNode) {
      throw new Error(`Parent or child node not found for IDs ${parentId} and ${childId}.`);
    }

    // A measured text leaf can't have Yoga children (Yoga forbids children on
    // a node with a measure func). Text fragment children — e.g. the strings a
    // <FormattedMessage> renders to — are folded into the parent's text by the
    // renderer, so they're not layout participants here.
    if (parentYogaNode.text !== undefined) {
      return;
    }

    index ??= childYogaNode.children.length;

    parentYogaNode.node.insertChild(childYogaNode.node, index);
    parentYogaNode.children.splice(index, 0, childYogaNode);
    childYogaNode.parent = parentYogaNode;
  }

  public detachChildNode(parentId: number, childId: number): void {
    const parentYogaNode = this._elementMap.get(parentId);
    const childYogaNode = this._elementMap.get(childId);

    if (!parentYogaNode || !childYogaNode) {
      return;
    }

    const idx = parentYogaNode.children.indexOf(childYogaNode);

    if (idx === -1) {
      return;
    }

    parentYogaNode.node.removeChild(childYogaNode.node);
    parentYogaNode.children.splice(idx, 1);
    childYogaNode.parent = undefined;
  }

  public addIndependentRoot(elementId: number): void {
    const node = this._elementMap.get(elementId);

    if (node) {
      this._independentRoots.add(node);
    }
  }

  public removeIndependentRoot(elementId: number): void {
    const node = this._elementMap.get(elementId);

    if (node) {
      this._independentRoots.delete(node);
    }
  }

  public queueRender(_elementId: number, force = false): void {
    if (!this._initialized || !this._yoga) {
      throw new Error('Yoga is not initialized! Did you call `init()`?');
    }

    if (this._isRenderQueued) {
      return;
    }

    this._isRenderQueued = true;

    // Microtask runs AFTER the current synchronous batch of style/node
    // ops (arriving from postMessage handlers); setTimeout's 1ms+ minimum
    // would fragment a batch into many render passes.
    queueMicrotask(() => {
      this._isRenderQueued = false;

      if (this._independentRoots.size === 0) {
        return;
      }

      this._initializeArrayBuffer();

      for (const independentRoot of this._independentRoots) {
        // undefined available size → yoga uses the root's own w/h (or
        // shrink-to-fit). Passing 1920×1080 would stretch any unset axis
        // and break measurement-driven roots like VirtualList cells.
        independentRoot.node.calculateLayout(
          undefined,
          undefined,
          // oxlint-disable-next-line typescript/no-non-null-assertion -- Already checked this._yoga above
          this._yoga!.DIRECTION_LTR,
        );
        this._getUpdatedStyles(independentRoot, force);
      }

      this._flushArrayBuffer(this._dataView.buffer);
    });
  }

  public applyStyles(
    styles: Record<number, Partial<LightningElementStyle>>,
    skipRender = false,
  ): void {
    if (!this._initialized) {
      throw new Error('Yoga was not initialized! Did you call `init()`?');
    }

    // `for...in` skips the [key, value] tuple allocation of Object.entries —
    // this is a hot path on every flushBoth/applyStyles message.
    for (const elementId in styles) {
      const style = styles[elementId as unknown as number];

      if (style !== undefined) {
        this.applyStyle(+elementId, style, skipRender);
      }
    }
  }

  public applyStyle(
    elementId: number,
    style: Partial<LightningElementStyle> | null,
    skipRender = false,
  ): void {
    if (!style) {
      return;
    }

    if (!this._initialized || !this._yoga || !this._config) {
      throw new Error('Yoga was not initialized! Did you call `init()`?');
    }

    const yogaNode = this._elementMap.get(elementId);

    if (!yogaNode) {
      console.warn(`Yoga node with ID ${elementId} not found.`);

      return;
    }

    applyReactPropsToYoga(this._yoga, this._yogaOptions, yogaNode, style);

    if (style.transform) {
      const { x, y, transform } = style;

      // Apply transforms after all the styles are applied
      if (transform) {
        const { translateX, translateY } = transform;

        if (translateX != null) {
          const left = x ?? 0;

          applyFlexPropToYoga(
            this._yoga,
            this._yogaOptions,
            yogaNode.node,
            'left',
            left + translateX,
          );
        }

        if (translateY != null) {
          const top = y ?? 0;

          applyFlexPropToYoga(
            this._yoga,
            this._yogaOptions,
            yogaNode.node,
            'top',
            top + translateY,
          );
        }
      }
    }

    if (!skipRender) {
      this.queueRender(elementId);
    }
  }

  private _flushArrayBuffer(buffer: ArrayBuffer) {
    // Emit the current buffer
    this._eventEmitter.emit('render', buffer);
    this._initializeArrayBuffer();
  }

  private _initializeArrayBuffer() {
    this._dataView.reset();
  }

  private _createNode(elementId: number): ManagerNode {
    if (!this._initialized || !this._yoga || !this._config) {
      throw new Error('Yoga was not initialized! Did you call `init()`?');
    }

    const node = this._yoga.Node.create(this._config);
    const yogaNode = {
      id: elementId,
      node,
      children: [],
      props: {},
    };

    this._elementMap.set(elementId, yogaNode);

    return yogaNode;
  }

  // Recursion is unconditional — yoga's hasNewLayout is per-node, so a
  // child's layout can change even when the parent's didn't (absolute
  // children, just-attached subtrees from _reattachChildren).
  private _getUpdatedStyles(yogaNode: ManagerNode, force = false) {
    const skipHiddenNode =
      !this._yogaOptions.processHiddenNodes && this._hiddenElements.has(yogaNode.id);

    if (!skipHiddenNode && (force || yogaNode.node.hasNewLayout())) {
      if (!this._dataView.hasSpace(APPROX_SIZEOF_UPDATE)) {
        this._flushArrayBuffer(this._dataView.buffer);
      }

      // Individual getters instead of getComputedLayout() — that allocates
      // a {left, top, width, height} object per node, and we recurse the
      // entire yoga tree every layout pass.
      const node = yogaNode.node;

      // Direct DataView writes — hasSpace above already validated the full
      // 12-byte run, so per-call overflow checks are pure overhead here.
      const view = this._dataView.dataView;
      const offset = this._dataView.offset;

      view.setUint32(offset, yogaNode.id, true);
      view.setInt16(offset + 4, node.getComputedLeft(), true);
      view.setInt16(offset + 6, node.getComputedTop(), true);
      view.setInt16(offset + 8, node.getComputedWidth(), true);
      view.setInt16(offset + 10, node.getComputedHeight(), true);
      this._dataView.advance(APPROX_SIZEOF_UPDATE);

      node.markLayoutSeen();
    }

    const children = yogaNode.children;

    for (let i = 0, len = children.length; i < len; i++) {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- length-bounded
      this._getUpdatedStyles(children[i]!, force);
    }
  }
}

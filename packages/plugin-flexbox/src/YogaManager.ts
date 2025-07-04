import type { LightningElementStyle, Rect } from '@plextv/react-lightning';
import { EventEmitter } from 'tseep';
import { type Config, loadYoga, type Node, type Yoga } from 'yoga-layout/load';
import type { YogaOptions } from './types/YogaOptions';
import applyReactPropsToYoga, {
  applyFlexPropToYoga,
} from './util/applyReactPropsToYoga';
import { SimpleDataView } from './util/SimpleDataView';

export type BatchedUpdate = Record<number, Partial<Rect>>;

type ManagerNode = {
  id: number;
  parent?: ManagerNode;
  node: Node;
  children: ManagerNode[];
};

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
  private _yoga?: Yoga;
  private _config?: Config;
  private _rootNode?: ManagerNode;
  private _initialized = false;
  private _isRenderQueued = false;
  private _queueTimeout: NodeJS.Timeout | undefined;
  private _yogaOptions: Required<YogaOptions> = {
    useWebDefaults: false,
    errata: 'none',
    processHiddenNodes: false,
    useWebWorker: false,
  };
  private _eventEmitter: EventEmitter<YogaManagerEvents> = new EventEmitter();
  private _dataView: SimpleDataView;

  public on = this._eventEmitter.on.bind(this._eventEmitter);
  public off = this._eventEmitter.off.bind(this._eventEmitter);

  public get initialized() {
    return this._initialized;
  }

  public constructor() {
    this._dataView = new SimpleDataView(
      MAX_SIZEOF_UPDATE,
      true,
      this._flushArrayBuffer,
    );
  }

  public async init(yogaOptions?: YogaOptions) {
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
        this._config.setErrata(
          this._yoga.ERRATA_ABSOLUTE_PERCENT_AGAINST_INNER_SIZE,
        );
        break;
      case 'absolute-position-without-insets':
        this._config.setErrata(
          this._yoga.ERRATA_ABSOLUTE_POSITION_WITHOUT_INSETS_EXCLUDES_PADDING,
        );
        break;
      default:
        this._config.setErrata(this._yoga.ERRATA_NONE);
        break;
    }

    this._initialized = true;
  }

  public addNode(elementId: number) {
    if (this._elementMap.has(elementId)) {
      // biome-ignore lint/style/noNonNullAssertion: Already checked
      return this._elementMap.get(elementId)!;
    }

    const node = this._createNode(elementId);

    this._elementMap.set(elementId, node);

    return node;
  }

  public removeNode(elementId: number) {
    const yogaNode = this._elementMap.get(elementId);

    if (yogaNode) {
      yogaNode.node.free();

      // Remove the node from its parent's children array
      if (yogaNode.parent) {
        const index = yogaNode.parent.children.indexOf(yogaNode);

        if (index !== -1) {
          yogaNode.parent.children.splice(index, 1);
        }
      }

      this._elementMap.delete(elementId);
    }
  }

  public addChildNode(parentId: number, childId: number, index?: number) {
    const parentYogaNode = this._elementMap.get(parentId);
    const childYogaNode = this._elementMap.get(childId);

    if (!parentYogaNode || !childYogaNode) {
      throw new Error(
        `Parent or child node not found for IDs ${parentId} and ${childId}.`,
      );
    }

    index ??= childYogaNode.children.length;

    parentYogaNode.node.insertChild(childYogaNode.node, index);
    parentYogaNode.children.splice(index, 0, childYogaNode);
    childYogaNode.parent = parentYogaNode;
  }

  public queueRender(elementId: number, force = false) {
    if (!this._initialized || !this._yoga) {
      throw new Error('Yoga is not initialized! Did you call `init()`?');
    }

    if (this._isRenderQueued && this._queueTimeout) {
      return;
    }

    this._isRenderQueued = true;

    this._queueTimeout = setTimeout(() => {
      let root = this._rootNode;

      if (!root) {
        const node = this._elementMap.get(elementId);

        if (!node) {
          return;
        }

        root = node;
        let curr: ManagerNode | undefined = node;

        while (curr) {
          root = curr;
          curr = curr.parent;
        }

        this._rootNode = root;
      }

      // biome-ignore lint/style/noNonNullAssertion: Already checked this._yoga above
      root.node.calculateLayout(1920, 1080, this._yoga!.DIRECTION_LTR);

      this._initializeArrayBuffer();
      this._getUpdatedStyles(root, force);
      this._flushArrayBuffer(this._dataView.buffer);

      this._isRenderQueued = false;
    }, 1);
  }

  public applyStyles(
    styles: Record<number, Partial<LightningElementStyle>>,
    skipRender = false,
  ) {
    if (!this._initialized || !this._yoga || !this._config) {
      throw new Error('Yoga was not initialized! Did you call `init()`?');
    }

    const styleEntries = Object.entries(styles);

    for (const [elementId, style] of styleEntries) {
      this.applyStyle(Number(elementId), style, skipRender);
    }
  }

  public applyStyle(
    elementId: number,
    style: Partial<LightningElementStyle> | null,
    skipRender = false,
  ) {
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

    applyReactPropsToYoga(this._yoga, yogaNode.node, style);

    if (style.transform) {
      const { x, y, transform } = style;

      // Apply transforms after all the styles are applied
      if (transform) {
        const { translateX, translateY } = transform;

        if (translateX != null) {
          const left = x ?? 0;

          applyFlexPropToYoga(
            this._yoga,
            yogaNode.node,
            'left',
            left + translateX,
          );
        }

        if (translateY != null) {
          const top = y ?? 0;

          applyFlexPropToYoga(
            this._yoga,
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

  public getClampedSize(elementId: number): number | null {
    // Text elements will already have its height and width set on the
    // node before loaded event is fired, so we need to set it on the yoga
    // node. If there's a maxWidth set, we should clamp the text to that size.
    const yogaNode = this._elementMap.get(elementId);

    if (!this._initialized || !this._yoga || !this._config) {
      throw new Error('Yoga was not initialized! Did you call `init()`?');
    }

    if (!yogaNode) {
      return null;
    }

    const maxWidth = yogaNode.node.getMaxWidth();

    if (
      !Number.isNaN(maxWidth.value) &&
      maxWidth.unit !== this._yoga.UNIT_UNDEFINED
    ) {
      // If there is a max width specified, the width on the yogaNode will
      // be the computed width
      let computedWidth = yogaNode.node.getComputedWidth();
      const isPercentage = maxWidth.unit === this._yoga.UNIT_PERCENT;

      if (Number.isNaN(computedWidth) || isPercentage) {
        const parentWidth = yogaNode.node.getParent()?.getComputedWidth();

        if (parentWidth) {
          computedWidth = isPercentage
            ? parentWidth * (maxWidth.value / 100)
            : parentWidth;
        } else if (maxWidth.unit === this._yoga.UNIT_POINT) {
          computedWidth = maxWidth.value;
        }
      }

      return !Number.isNaN(computedWidth) ? computedWidth : null;
    }

    return null;
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
    };

    this._elementMap.set(elementId, yogaNode);

    return yogaNode;
  }

  // returns the new offset in the dataView
  private _getUpdatedStyles(yogaNode: ManagerNode, force = false) {
    const skipHiddenNode =
      !this._yogaOptions.processHiddenNodes &&
      this._hiddenElements.has(yogaNode.id);

    if (!force && (skipHiddenNode || !yogaNode.node.hasNewLayout())) {
      return;
    }

    // We want to keep chunks together, so check the size to ensure we have enough space
    if (!this._dataView.hasSpace(APPROX_SIZEOF_UPDATE)) {
      // If we don't have enough space, flush the current buffer
      this._flushArrayBuffer(this._dataView.buffer);
    }

    const layout = yogaNode.node.getComputedLayout();

    this._dataView.writeUint32(yogaNode.id);
    this._dataView.writeInt16(layout.left);
    this._dataView.writeInt16(layout.top);
    this._dataView.writeInt16(layout.width);
    this._dataView.writeInt16(layout.height);

    yogaNode.node.markLayoutSeen();

    for (const child of yogaNode.children) {
      this._getUpdatedStyles(child, force);
    }
  }
}

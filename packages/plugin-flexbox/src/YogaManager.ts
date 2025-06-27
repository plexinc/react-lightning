import type { LightningElementStyle, Rect } from '@plextv/react-lightning';
import { EventEmitter } from 'tseep';
import { type Config, loadYoga, type Node, type Yoga } from 'yoga-layout/load';
import {
  UPDATE_HEIGHT,
  UPDATE_WIDTH,
  UPDATE_X,
  UPDATE_Y,
} from './types/UpdateFlags';
import type { YogaOptions } from './types/YogaOptions';
import applyReactPropsToYoga, {
  applyFlexPropToYoga,
} from './util/applyReactPropsToYoga';

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
  //   uint8 - a bitmask that indicates which properties are set.
  //     Examples:
  //       If only x and y are set, the FLAG will be 0b00000011 (3).
  //       If only width and height are set, the FLAG will be 0b00001100 (12).
  //       If all properties are set, the FLAG will be 0b00001111 (15).
  //  int16? - The x coordinate of the element, only included if the x flag is set.
  //  int16? - The y coordinate of the element, only included if the y flag is set.
  //  int16? - The width of the element, only included if the width flag is set.
  //  int16? - The height of the element, only included if the height flag is set.
  render: (updates: ArrayBuffer) => void;
};

// elementId + flags + x + y + width + height, as per spec above
const APPROX_SIZEOF_UPDATE = 4 + 1 + 2 + 2 + 2 + 2;
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
  private _currentArrayBuffer?: ArrayBuffer;
  private _currentDataView?: DataView;
  private _currentOffset = 0;

  public on = this._eventEmitter.on.bind(this._eventEmitter);
  public off = this._eventEmitter.off.bind(this._eventEmitter);

  public get initialized() {
    return this._initialized;
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

  public addChildNode(parentId: number, childId: number, index: number) {
    const parentYogaNode = this._elementMap.get(parentId);
    const childYogaNode = this._elementMap.get(childId);

    if (!parentYogaNode || !childYogaNode) {
      throw new Error(
        `Parent or child node not found for IDs ${parentId} and ${childId}.`,
      );
    }

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
      this._flushArrayBuffer();

      this._isRenderQueued = false;
    }, 1);
  }

  public applyStyles(styles: Record<number, Partial<LightningElementStyle>>) {
    if (!this._initialized || !this._yoga || !this._config) {
      throw new Error('Yoga was not initialized! Did you call `init()`?');
    }

    const styleEntries = Object.entries(styles);

    for (const [elementId, style] of styleEntries) {
      this.applyStyle(Number(elementId), style);
    }
  }

  public applyStyle(elementId: number, style: Partial<LightningElementStyle>) {
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

  private _flushArrayBuffer() {
    if (!this._currentArrayBuffer || !this._currentDataView) {
      return;
    }

    // Emit the current buffer
    this._eventEmitter.emit('render', this._currentArrayBuffer);

    // Reset the current buffer and data view
    this._currentArrayBuffer = undefined;
    this._currentDataView = undefined;
    this._currentOffset = 0;
  }

  private _initializeArrayBuffer() {
    if (this._currentArrayBuffer) {
      // If we already have a buffer, warn
      console.warn(
        'YogaManager: Buffer already initialized. Clearing the previous buffer. Any data in it will be lost.',
      );
    }

    // Create a new buffer and data view
    this._currentArrayBuffer = new ArrayBuffer(MAX_SIZEOF_UPDATE);
    this._currentDataView = new DataView(this._currentArrayBuffer);
    this._currentOffset = 0;
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

    if (!this._currentDataView || !this._currentArrayBuffer) {
      // If we don't have a data view or array buffer, initialize them
      throw new Error(
        'YogaManager: DataView or ArrayBuffer not initialized! Did you call `queueRender`?',
      );
    }

    if (!force && (skipHiddenNode || !yogaNode.node.hasNewLayout())) {
      return;
    }

    // Ensure we have enough space in the dataView
    if (
      this._currentOffset + APPROX_SIZEOF_UPDATE >
      this._currentDataView.byteLength
    ) {
      // Too big. Send what we have, and create a new buffer
      this._flushArrayBuffer();
      this._initializeArrayBuffer();
    }

    const layout = yogaNode.node.getComputedLayout();
    const dataView = this._currentDataView;

    // Increase item count
    dataView.setUint32(0, dataView.getUint32(0) + 1);

    if (this._currentOffset === 0) {
      this._currentOffset = 4;
    }

    // Set the element ID
    dataView.setUint32(this._currentOffset, yogaNode.id);
    this._currentOffset += 4;

    // Set the flags for the properties that are set. X and Y will always be set
    const flagIndex = this._currentOffset;
    dataView.setUint8(this._currentOffset, UPDATE_X | UPDATE_Y);
    this._currentOffset += 1;

    // x and y will always be set, so set the flags
    dataView.setInt16(this._currentOffset, layout.left);
    this._currentOffset += 2;

    dataView.setInt16(this._currentOffset, layout.top);
    this._currentOffset += 2;

    if (!Number.isNaN(layout.width)) {
      dataView.setInt16(this._currentOffset, layout.width);
      this._currentOffset += 2;

      // Update the flags to indicate width is set
      dataView.setUint8(flagIndex, dataView.getUint8(flagIndex) | UPDATE_WIDTH);
    }

    if (!Number.isNaN(layout.height)) {
      dataView.setInt16(this._currentOffset, layout.height);
      this._currentOffset += 2;

      // Update the flags to indicate height is set
      dataView.setUint8(
        flagIndex,
        dataView.getUint8(flagIndex) | UPDATE_HEIGHT,
      );
    }

    yogaNode.node.markLayoutSeen();

    for (const child of yogaNode.children) {
      this._getUpdatedStyles(child, force);
    }
  }
}

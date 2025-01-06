import type {
  LightningElement,
  LightningElementStyle,
  LightningViewElementStyle,
  Plugin,
} from '@plex/react-lightning';
import type { Node } from 'yoga-layout';
import applyReactPropsToYoga, {
  applyFlexPropToYoga,
} from './applyReactPropsToYoga';
import { isFlexStyleProp } from './isFlexStyleProp';
import type { YogaOptions } from './yoga';
import Yoga, { createNode, init } from './yoga';

export default function flexPlugin(
  yogaOptions?: YogaOptions,
): Plugin<LightningElement> {
  let _isRenderQueued = false;
  let _rootElement: LightningElement | null = null;
  let _queueTimeout: number | null = null;

  function getRootElement(element: LightningElement): LightningElement {
    if (_rootElement) {
      return _rootElement;
    }

    let parent: LightningElement | null = element;
    let root = element;

    while (parent) {
      root = parent;
      parent = parent.parent as LightningElement;
    }

    if (root.node.id === 1) {
      _rootElement = root;
    }

    return root;
  }

  function applyLayout(element: LightningElement, force = false) {
    const node = element.yogaNode;

    if (!node) {
      return;
    }

    if ((!element || !node.hasNewLayout()) && !force) {
      return;
    }

    const layout = node.getComputedLayout();

    // Apply layout directly to the node to prevent re-rendering, and the
    // style retains the original value that was set.
    let skipX = false;
    let skipY = false;

    if (element.parent?.style.display !== 'flex') {
      skipX =
        element.style.x !== undefined &&
        element.style.transform?.translateX === undefined;
      skipY =
        element.style.y !== undefined &&
        element.style.transform?.translateY === undefined;
    }

    if (!skipX) {
      element.setNodeProp('x', layout.left);
    }

    if (!skipY) {
      element.setNodeProp('y', layout.top);
    }

    if (!Number.isNaN(layout.width)) {
      element.setNodeProp('width', layout.width);
    }

    if (!Number.isNaN(layout.height)) {
      element.setNodeProp('height', layout.height);
    }

    node.markLayoutSeen();

    for (const child of element.children) {
      applyLayout(child, force);
    }

    element.emit('flexLayout');
    element.emit('layout', {
      x: element.node.x,
      y: element.node.y,
      height: element.node.height,
      width: element.node.width,
    });
  }

  function applyTransform(style: LightningElementStyle, yogaNode: Node) {
    const { x, y, transform } = style;

    // Apply transforms after all the styles are applied
    if (transform) {
      const { translateX, translateY } = transform;

      if (translateX != null) {
        const left = x ?? 0;

        applyFlexPropToYoga(yogaNode, 'left', left + translateX);
      }

      if (translateY != null) {
        const top = y ?? 0;

        applyFlexPropToYoga(yogaNode, 'top', top + translateY);
      }
    }
  }

  function queueRender(element: LightningElement, force = false) {
    if (_isRenderQueued && _queueTimeout) {
      window.clearTimeout(_queueTimeout);
    }

    _isRenderQueued = true;

    _queueTimeout = window.setTimeout(() => {
      const rootElement = getRootElement(element);

      if (rootElement.yogaNode) {
        rootElement.yogaNode.calculateLayout(
          rootElement?.style.width,
          rootElement?.style.height,
          Yoga.instance.DIRECTION_LTR,
        );

        applyLayout(rootElement, force);
      }

      _isRenderQueued = false;
    }, 1);
  }

  function getYogaStyle(style: Partial<LightningViewElementStyle> | null = {}) {
    const yogaStyles: typeof style = {};

    for (const key in style) {
      if (isFlexStyleProp(key)) {
        const value = style[key];

        if (value != null) {
          // biome-ignore lint/suspicious/noExplicitAny: TODO
          (yogaStyles as any)[key] = value;
        }
      }
    }

    return yogaStyles;
  }

  return {
    init() {
      return init(yogaOptions);
    },

    onCreateInstance(instance) {
      const flexInstance = instance as LightningElement;

      flexInstance.yogaNode = createNode();

      const disposers = [
        flexInstance.on('initialized', () => {
          const initialDimensions = flexInstance.style.initialDimensions;

          if (initialDimensions) {
            flexInstance.node.width = initialDimensions.width;
            flexInstance.node.height = initialDimensions.height;
            flexInstance.node.x = initialDimensions.x;
            flexInstance.node.y = initialDimensions.y;
          }
        }),

        flexInstance.on('destroy', () => {
          for (const dispose of disposers) {
            dispose();
          }

          flexInstance.yogaNode?.free();
          flexInstance.yogaNode = undefined;

          queueRender(flexInstance);
        }),

        flexInstance.on('childAdded', (child, index) => {
          if (!flexInstance.yogaNode || !child.yogaNode) {
            return;
          }

          flexInstance.yogaNode.insertChild(child.yogaNode, index);

          const yogaStyle = getYogaStyle(flexInstance.props.style);

          applyReactPropsToYoga(flexInstance.yogaNode, yogaStyle);

          queueRender(flexInstance);
        }),

        flexInstance.on('childRemoved', (child) => {
          if (!flexInstance.yogaNode || !child.yogaNode) {
            return;
          }

          flexInstance.yogaNode.removeChild(child.yogaNode);

          queueRender(flexInstance);
        }),

        flexInstance.on('stylesChanged', () => {
          if (!flexInstance.yogaNode?.getParent()) {
            return;
          }

          queueRender(flexInstance);
        }),

        flexInstance.on('textureLoaded', (node, event) => {
          if (!flexInstance.yogaNode) {
            return;
          }

          // Text elements will already have its height and width set on the
          // node before loaded event is fired, so we need to set it on the yoga
          // node. If there's a maxWidth set, we should clamp the text to that size.
          const maxWidth = flexInstance.yogaNode.getMaxWidth();

          if (
            !Number.isNaN(maxWidth.value) &&
            maxWidth.unit !== Yoga.instance.UNIT_UNDEFINED
          ) {
            // If there is a max width specified, the width on the yogaNode will
            // be the computed width
            let computedWidth = flexInstance.yogaNode.getComputedWidth();

            if (
              Number.isNaN(computedWidth) &&
              maxWidth.unit === Yoga.instance.UNIT_PERCENT
            ) {
              // Try to get the parent width and calculating manually
              const parentWidth = flexInstance.yogaNode
                .getParent()
                ?.getComputedWidth();

              if (parentWidth) {
                computedWidth = parentWidth * (maxWidth.value / 100);
              }
            }

            if (event.dimensions.width > computedWidth) {
              node.contain = 'width';
              node.width = computedWidth;
            }
          }

          applyFlexPropToYoga(flexInstance.yogaNode, 'width', node.width);
          applyFlexPropToYoga(flexInstance.yogaNode, 'height', node.height);

          queueRender(flexInstance);
        }),
      ];
    },
    transformProps(instance, props) {
      const remainingStyles = props.style;

      if (!remainingStyles) {
        return props;
      }

      const yogaNode = instance.yogaNode;

      if (!yogaNode) {
        return props;
      }

      for (const key in remainingStyles) {
        const value = remainingStyles[key as keyof LightningViewElementStyle];

        if (!isFlexStyleProp(key) || value == null) {
          continue;
        }

        applyFlexPropToYoga(
          yogaNode,
          key,
          value as LightningViewElementStyle[typeof key],
        );

        if (key !== 'width' && key !== 'height') {
          delete remainingStyles[key];
        }
      }

      if (props.style && 'transform' in props.style) {
        applyTransform(props.style, yogaNode);
      }

      return { ...props, style: remainingStyles };
    },
  };
}

export * from './types';

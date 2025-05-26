import type { LightningElement, Plugin } from '@plextv/react-lightning';
import type { SetOptional } from 'type-fest';

function getChildrenSize(
  children: LightningElement[],
  dimensionProperty: 'width' | 'height',
) {
  let totalSize = 0;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (!child) {
      continue;
    }

    const dimensions = child.getBoundingClientRect();

    totalSize += dimensions[dimensionProperty];
  }

  return totalSize;
}

function getAvailableSize(
  instance: LightningElement,
  dimensionProperty: 'width' | 'height',
) {
  let size = instance.node[dimensionProperty];

  if (size === 0) {
    console.warn(
      `No ${dimensionProperty} found on Flex element - please set it for performance reasons`,
      instance,
    );

    let curr: LightningElement | null = instance;

    while (curr !== null && size === 0) {
      size = curr.node[dimensionProperty];
      curr = curr.parent;
    }

    if (size === 0) {
      return null;
    }
  }

  return size;
}

function applyFlexLayout(instance: LightningElement) {
  const { style } = instance.props;
  const { children } = instance;

  if (style == null || style === undefined) {
    return;
  }

  const flexDirection = style.flexDirection || 'row';
  const justifyContent = style.justifyContent || 'flex-start';
  const isHorizontal =
    flexDirection === 'row' || flexDirection === 'row-reverse';
  const dimensionProperty = isHorizontal ? 'width' : 'height';
  const axisProperty = isHorizontal ? 'x' : 'y';

  // Compute the total width/height of child elements
  const childrenSize = getChildrenSize(children, dimensionProperty);

  // Compute the available space in the parent
  let availableSize = getAvailableSize(instance, dimensionProperty);

  if (availableSize === null) {
    console.warn(
      `No useable ${dimensionProperty} found, flex cant determine available space and wont take effect`,
      instance,
    );

    return;
  }

  console.debug(
    `Applying Flex Layout: id: ${instance.id} direction: ${flexDirection} justify: ${justifyContent}. Size: ${childrenSize}, available space: ${availableSize}`,
  );

  // Compute the positions and dimensions of child elements
  let currentPosition = 0;
  let evenSpace = 0;

  if (justifyContent === 'center') {
    currentPosition = availableSize / 2 - childrenSize / 2;
  }

  if (justifyContent === 'flex-end') {
    currentPosition = availableSize - childrenSize;
  }

  const useMarginA = isHorizontal ? 'marginLeft' : 'marginRight';
  const useMarginB = isHorizontal ? 'marginTop' : 'marginBottom';
  const marginA = style[useMarginA] ?? 0;
  const marginB = style[useMarginB] ?? 0;
  const gap = style.gap ?? 0;

  if (justifyContent === 'space-evenly') {
    evenSpace = (availableSize - childrenSize) / (children.length + 1);
  }

  if (justifyContent === 'space-between') {
    evenSpace = (availableSize - childrenSize) / (children.length - 1);
  }

  if (justifyContent === 'space-around') {
    const aroundStartSpace =
      (availableSize - childrenSize) / (children.length + 1) / children.length +
      1;

    currentPosition += aroundStartSpace;
    availableSize -= aroundStartSpace * 2;
  }

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (!child || child.props.style?.position === 'absolute') {
      continue;
    }

    const dimensions = {
      x: 0,
      y: 0,
      width: child.node.width,
      height: child.node.height,
    };

    currentPosition += marginA;
    dimensions[axisProperty] = currentPosition + evenSpace;
    currentPosition += dimensions[dimensionProperty] + marginB + evenSpace;

    if (justifyContent === 'space-around') {
      currentPosition += (availableSize - childrenSize) / (children.length - 1);
    }

    dimensions[axisProperty] += marginB;

    if (i > 0 && i < children.length) {
      dimensions[axisProperty] += gap * i;
    }

    // set it on style, but avoid the proxy so it wont reapply the flex layout
    child.node[axisProperty] = dimensions[axisProperty];
  }
}

function canFlexCanBeApplied(
  instance: SetOptional<LightningElement, 'node'> | null,
  isChild = false,
): instance is LightningElement {
  if (
    instance === null ||
    instance === undefined ||
    'node' in instance === false
  ) {
    return false;
  }

  if (isChild && instance.parent === null) {
    return false;
  }

  if (isChild === false && instance.parent?.children.length === 0) {
    return false;
  }

  const style = isChild ? instance.parent?.style : instance.style;

  if (style?.display !== 'flex') {
    return false;
  }

  if (
    (style?.flexDirection === 'row' ||
      style?.flexDirection === 'row-reverse') &&
    style.width
  ) {
    return true;
  }

  if (
    (style?.flexDirection === 'column' ||
      style?.flexDirection === 'column-reverse') &&
    style.height
  ) {
    return true;
  }

  return false;
}

export default function flexPlugin(): Plugin<LightningElement> {
  const updateQueue: LightningElement[] = [];
  let _isUpdateQueued = false;

  function queueUpdate(instance: LightningElement) {
    if (updateQueue.includes(instance) === false) {
      updateQueue.push(instance);
    }

    if (_isUpdateQueued === true) {
      return;
    }

    _isUpdateQueued = true;

    window.setTimeout(() => {
      _isUpdateQueued = false;
      while (updateQueue.length > 0) {
        const instance = updateQueue.shift();
        if (instance === null || instance === undefined) {
          continue;
        }

        applyFlexLayout(instance);
      }
    }, 1);
  }

  return {
    onCreateInstance(instance, props) {
      if (
        props === undefined ||
        props.style == null ||
        props.style === undefined
      ) {
        return;
      }

      // if its not a flex item, return
      if (props.style.display !== 'flex') {
        return;
      }

      let initialized = false;

      const disposers = [
        instance.on('initialized', () => {
          initialized = true;

          if (canFlexCanBeApplied(instance)) {
            // queueUpdate(instance.parent as LightningElement);
            queueUpdate(instance);
          }
        }),
        instance.on('destroy', () => {
          for (const dispose of disposers) {
            dispose();
          }
        }),
        instance.on('childInserted', (child) => {
          if (
            canFlexCanBeApplied(child, true) &&
            canFlexCanBeApplied(child.parent)
          ) {
            queueUpdate(child.parent);
          }
        }),
        instance.on('childRemoved', (child) => {
          if (
            canFlexCanBeApplied(child, true) &&
            canFlexCanBeApplied(child.parent)
          ) {
            queueUpdate(child.parent);
          }
        }),
        instance.on('styleChanged', () => {
          if (initialized === false) {
            return;
          }

          if (canFlexCanBeApplied(instance, true)) {
            queueUpdate(instance);
          }
        }),
        instance.on('textureLoaded', (node, event) => {
          if (initialized === false) {
            return;
          }

          if (
            node === undefined ||
            node === null ||
            event.dimensions === undefined ||
            event.dimensions === null
          ) {
            return;
          }

          if (
            canFlexCanBeApplied(instance, true) &&
            (event.dimensions.width !== instance.node.width ||
              event.dimensions.height !== instance.node.height)
          ) {
            queueUpdate(instance);
          }
        }),
      ];
    },
    transformProps(instance, props) {
      if (canFlexCanBeApplied(instance, true)) {
        queueUpdate(instance);
      }

      return props;
    },
  };
}

export * from './types';

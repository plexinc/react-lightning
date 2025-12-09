import { EventEmitter, type IEventEmitter } from 'tseep';
import type { Focusable } from '../types';
import type { EventNotifier } from '../types/EventNotifier';
import type { Traps } from './Traps';

type RootNode<T> = {
  element: null;
  children: FocusNode<T>[];
  focusedElement: FocusNode<T> | null;
  hasFocusableChildren: boolean;
};

export type FocusNode<T> = Omit<RootNode<T>, 'element'> & {
  element: T;
  children: FocusNode<T>[];
  parent: FocusNode<T> | RootNode<T>;
  focusedElement: FocusNode<T> | null;
  autoFocus: boolean;
  focusRedirect: boolean;
  destinations: (T | null)[] | null;
  traps: Traps;
  hasFocusableChildren: boolean;
};

type FocusLayer<T> = {
  root: RootNode<T>;
  elements: Map<T, FocusNode<T>>;
  focusPath: T[];
};

type FocusEvents<T> = {
  blurred: (target: T) => void;
  focused: (target: T) => void;
  focusPathChanged: (focusPath: T[]) => void;
  layerAdded: () => void;
  layerRemoved: () => void;
};

function isRootNode<T>(node: FocusNode<T> | RootNode<T>): node is RootNode<T> {
  return !('parent' in node) && node.element === null;
}

function hasExternalRedirect<T extends { parent?: T | null }>(
  node: FocusNode<T>,
): boolean {
  if (!node.focusRedirect || !node.destinations) {
    return false;
  }

  return node.destinations.some((destination) => {
    let curr = destination;

    while (curr) {
      if (curr === node.element) {
        return false;
      }
      curr = curr.parent as T | null;
    }

    return true;
  });
}

export class FocusManager<
  T extends Focusable & {
    id: number;
    parent?: T | null;
    isFocusGroup?: boolean;
  },
> implements EventNotifier<FocusEvents<T>>
{
  private _disposers: Map<T, (() => void)[]> = new Map();
  private _focusStack: FocusLayer<T>[] = [];
  private _eventEmitter = new EventEmitter<FocusEvents<T>>();

  public get activeLayer(): FocusLayer<T> {
    if (this._focusStack.length === 0) {
      throw new Error('No more focus stacks! This should not occur');
    }

    return this._focusStack[this._focusStack.length - 1] as FocusLayer<T>;
  }

  public get focusPath(): T[] {
    return this.activeLayer.focusPath;
  }

  public constructor() {
    this._focusStack = [
      {
        root: {
          element: null,
          children: [],
          focusedElement: null,
          hasFocusableChildren: false,
        },
        elements: new Map(),
        focusPath: [],
      },
    ];
  }

  public on = (
    ...args: Parameters<IEventEmitter<FocusEvents<T>>['on']>
  ): (() => void) => {
    this._eventEmitter.on(...args);

    return () => this._eventEmitter.off(...args);
  };
  public off: EventEmitter<FocusEvents<T>>['off'] = this._eventEmitter.off.bind(
    this._eventEmitter,
  );
  public emit: EventEmitter<FocusEvents<T>>['emit'] =
    this._eventEmitter.emit.bind(this._eventEmitter);

  public getFocusNode(element: T): FocusNode<T> | null {
    const node = this.activeLayer.elements.get(element);

    if (node) {
      return node;
    }

    return null;
  }

  public addElement(
    child: T,
    parent?: T | null,
    options?: {
      autoFocus?: boolean;
      focusRedirect?: boolean;
      destinations?: (T | null)[] | null;
      traps?: Traps;
    },
  ): void {
    const autoFocus = options?.autoFocus ?? false;
    const focusRedirect = options?.focusRedirect ?? false;
    const destinations = options?.destinations ?? null;
    const traps = options?.traps ?? {
      up: false,
      right: false,
      down: false,
      left: false,
    };
    const { elements, root } = this.activeLayer;
    let parentNode: FocusNode<T> | RootNode<T> | null = null;

    if (parent) {
      const storedNode = elements.get(parent);

      if (!storedNode) {
        // Check if the parent exists in the previous layer. Sometimes this
        // happens because of the way React creates elements; components and
        // their hooks are run before getting attached to the tree. This causes
        // the component to get added to the old layer before the new layer's
        // created.
        const parentNodeInPreviousLayer:
          | RootNode<T>
          | FocusNode<T>
          | undefined = this._focusStack.at(-2)?.elements?.get?.(parent);

        if (
          parentNodeInPreviousLayer &&
          !isRootNode(parentNodeInPreviousLayer)
        ) {
          parentNode = this._addMissingParentsToCurrentLayer(
            parentNodeInPreviousLayer,
          );
        }

        if (!parentNode) {
          parentNode = this._createFocusNode(parent, root);
        }

        if (!root.focusedElement) {
          root.focusedElement = parentNode;
        }
      } else {
        parentNode = storedNode;
      }
    } else {
      parentNode = root;
    }

    let childNode = elements.get(child);

    if (childNode) {
      childNode.autoFocus = autoFocus;
      childNode.focusRedirect = focusRedirect;
      childNode.destinations = destinations;
      childNode.traps = traps;

      // If the child node already exists, we need to remove it from its current parent
      if (childNode.parent !== parentNode) {
        const index = childNode.parent.children.indexOf(childNode);

        if (childNode.parent.focusedElement === childNode) {
          childNode.parent.focusedElement = this._findNextBestFocus(
            childNode.parent,
            childNode,
          );
        }

        if (index !== -1) {
          childNode.parent.children.splice(index, 1);
        }

        childNode.parent = parentNode;
      }
    } else {
      // If the child node doesn't exist, we need to create it
      childNode = this._createFocusNode(
        child,
        parentNode,
        autoFocus,
        focusRedirect,
        destinations,
        traps,
      );
    }

    if (parentNode.children.indexOf(childNode) === -1) {
      parentNode.children.push(childNode);
    }

    this._checkFocusableChildren(parentNode);

    if (
      child.focusable &&
      !hasExternalRedirect(childNode) &&
      (!parentNode.focusedElement ||
        (!parentNode.focusedElement.autoFocus && autoFocus))
    ) {
      parentNode.focusedElement = childNode;
    }

    this._recalculateFocusPath();
  }

  private _forAllNodes(
    element: T,
    callback: (node: FocusNode<T>) => void,
  ): void {
    for (let i = this._focusStack.length - 1; i >= 0; i--) {
      const layer = this._focusStack[i];
      // biome-ignore lint/style/noNonNullAssertion: Already asserted layer exists
      const node = layer!.elements.get(element);

      if (node) {
        callback(node);
      }
    }
  }

  public removeElement(element: T): void {
    this._forAllNodes(element, (node) => {
      this._removeNode(node, true);
    });
  }

  public setTraps(element: T, traps: Traps): void {
    this._forAllNodes(element, (node) => {
      node.traps = traps;
    });
  }

  public setAutoFocus(element: T, autoFocus?: boolean): void {
    this._forAllNodes(element, (node) => {
      node.autoFocus = !!autoFocus;
    });
  }

  public setFocusRedirect(element: T, focusRedirect?: boolean): void {
    // Only apply redirect to the active layer, as redirects are likely to be layer-specific
    const node = this.activeLayer.elements.get(element);

    if (node) {
      node.focusRedirect = !!focusRedirect;
    }
  }

  public setDestinations(element: T, destinations?: (T | null)[]): void {
    this._forAllNodes(element, (node) => {
      node.destinations = destinations ?? null;
    });
  }

  public pushLayer(): void {
    // Store the current layer before creating new one
    const previousLayer = this.activeLayer;

    // Blur all currently focused elements (they belong to the previous layer)
    for (const element of previousLayer.focusPath) {
      if (element.focused) {
        element.blur();
        this._eventEmitter.emit('blurred', element);
      }
    }

    // Create a new layer
    const newLayer: FocusLayer<T> = {
      root: {
        element: null,
        children: [],
        focusedElement: null,
        hasFocusableChildren: false,
      },
      elements: new Map(),
      focusPath: [],
    };

    this._focusStack.push(newLayer);

    this._recalculateFocusPath();

    this._eventEmitter.emit('layerAdded');
  }

  public popLayer(): void {
    // Never close the main layer
    if (this._focusStack.length <= 1) {
      return;
    }

    // Get current layer info before popping
    const currentLayer = this.activeLayer;

    // Blur all elements in current layer
    for (const element of currentLayer.focusPath) {
      if (element.focused) {
        element.blur();
        this._eventEmitter.emit('blurred', element);
      }
    }

    // biome-ignore lint/style/noNonNullAssertion: Already checked above
    this._focusStack.pop()!;

    this._eventEmitter.emit('layerRemoved');

    // Now restore focus to the previous layer (which is now active)
    const restoredLayer = this.activeLayer;

    // Focus the elements that should be focused in the restored layer
    for (const element of restoredLayer.focusPath) {
      if (!element.focused) {
        element.focus();
        this._eventEmitter.emit('focused', element);
      }
    }

    // Update the focus path to trigger any necessary events
    this._eventEmitter.emit('focusPathChanged', restoredLayer.focusPath);
  }

  public popAllLayers(): void {
    // Never close the main layer
    while (this._focusStack.length > 1) {
      this.popLayer();
    }
  }

  public focus(element: T): void {
    const node = this.activeLayer.elements.get(element);

    if (!node) {
      return;
    }

    this._focusNode(node);
  }

  // Print out the whole focus tree
  public toString(): string {
    const printNode = (node: FocusNode<T> | RootNode<T>, depth = 0): string => {
      const indent = ' '.repeat((depth - (node.element?.focused ? 1 : 0)) * 2);
      let result = `${indent}${node.element?.focused ? '> ' : ''}${node.element ? node.element.toString() : 'Root'}\n`;

      for (const child of node.children) {
        result += printNode(child, depth + 1);
      }

      return result;
    };

    return printNode(this.activeLayer.root);
  }

  // Prints the focus path to this element. If fullPath is true, it will include the focused child nodes.
  public printPath(node: FocusNode<T>, fullPath = true): string {
    const path: string[] = [];
    let curr: FocusNode<T> | null = node;

    while (curr) {
      path.unshift(curr.element.id.toString());
      curr = !isRootNode(curr.parent) ? curr.parent : null;
    }

    if (fullPath) {
      curr = node.focusedElement;

      while (curr) {
        path.push(curr.element.id.toString());
        curr = curr.focusedElement;
      }
    }

    return path
      .map((id) => (id === node.element.id.toString() ? `[${id}]` : id))
      .join(' > ');
  }

  private _addMissingParentsToCurrentLayer(nodeFromAnotherLayer: FocusNode<T>) {
    let curr: FocusNode<T> | RootNode<T> = nodeFromAnotherLayer;

    const stack: FocusNode<T>[] = [];

    // First build a stack of nodes to create
    while (!isRootNode(curr)) {
      stack.push(curr);
      curr = curr.parent;
    }

    let prevNode: FocusNode<T> | null = null;

    while (stack.length > 0) {
      // biome-ignore lint/style/noNonNullAssertion: Already asserted stack is not empty
      const nodeToCreate = stack.pop()!;
      const parentNode = prevNode === null ? this.activeLayer.root : prevNode;
      const newNode = this._createFocusNode(nodeToCreate.element, parentNode);

      parentNode.focusedElement = newNode;

      prevNode = newNode;
    }

    return prevNode;
  }

  private _createFocusNode(
    element: T,
    parent: FocusNode<T> | RootNode<T>,
    autoFocus = false,
    focusRedirect = false,
    destinations: (T | null)[] | null = null,
    traps: Traps = { up: false, right: false, down: false, left: false },
  ) {
    const node: FocusNode<T> = {
      element,
      children: [],
      parent,
      focusedElement: null,
      autoFocus,
      focusRedirect,
      destinations,
      traps,
      hasFocusableChildren: false,
    };

    this.activeLayer.elements.set(element, node);

    parent.children.push(node);

    this._addEventListeners(node);

    return node;
  }

  private _addEventListeners(node: FocusNode<T>) {
    const { element } = node;

    this._disposers.set(element, [
      element.on('focusableChanged', (_, isFocusable) => {
        if (!node.parent.focusedElement) {
          node.parent.focusedElement = this._findNextBestFocus(node.parent);
        } else if (!isFocusable && node.parent.focusedElement === node) {
          node.parent.focusedElement = this._findNextBestFocus(
            node.parent,
            node,
          );
        }
        this._checkFocusableChildren(node.parent);
        this._recalculateFocusPath();
      }),
      element.on('focusChanged', (_, isFocused) => {
        if (isFocused && !element.focused) {
          this.focus(element);
        }
      }),
    ]);
  }

  private _removeEventListeners(node: FocusNode<T>) {
    const { element } = node;

    const disposers = this._disposers.get(element);
    if (disposers) {
      for (const dispose of disposers) {
        dispose();
      }

      this._disposers.delete(element);
    }
  }

  private _focusNode(childNode: FocusNode<T>) {
    let currParent = childNode.parent;
    let currChild: FocusNode<T> | RootNode<T> = childNode;
    const elements = this.activeLayer.elements;

    while (currChild && !isRootNode(currChild) && currParent) {
      if (currChild.focusRedirect && currChild.destinations) {
        // TODO: Probably something smarter here to decide which destination to focus
        const destination = currChild.destinations?.find(
          (child) => child?.focusable,
        );

        if (destination) {
          const focusNode = elements.get(destination);

          if (!focusNode) {
            console.warn(
              'FocusManager: No focus node found for destination',
              destination,
            );
            return;
          }

          this._focusNode(focusNode);
          return;
        }
      }

      currParent.focusedElement = currChild as FocusNode<T>;
      currChild = currParent;
      currParent =
        'parent' in currChild ? currChild.parent : this.activeLayer.root;
    }

    this._recalculateFocusPath();
  }

  private _removeNode(node: FocusNode<T>, isTopMostParentNode: boolean) {
    // Remove all the children too
    for (const child of node.children) {
      this._removeNode(child, false);
    }

    const removeIndex = node.parent.children.indexOf(node);

    if (removeIndex !== -1) {
      node.parent.children.splice(removeIndex, 1);
    }

    if (isTopMostParentNode && node.parent.focusedElement === node) {
      node.parent.focusedElement = this._findNextBestFocus(node.parent, node);
    }

    this.activeLayer.elements.delete(node.element);

    if (isTopMostParentNode) {
      this._recalculateFocusPath();
    }

    this._removeEventListeners(node);
  }

  private _checkFocusableChildren(parentNode: FocusNode<T> | RootNode<T>) {
    const children = parentNode.children;
    const childrenLength = children.length;

    if (childrenLength === 0) {
      parentNode.hasFocusableChildren = false;
      return;
    }

    const leafNodes = new Set<number>();
    let hasFocusableChildren = false;

    for (let i = 0; i < childrenLength; i++) {
      // biome-ignore lint/style/noNonNullAssertion: Already asserted that child exists
      const child = children[i]!;

      if (child.element.focusable) {
        hasFocusableChildren = true;
      }

      if (child.children.length === 0) {
        leafNodes.add(child.element.id);
      }
    }

    parentNode.hasFocusableChildren = hasFocusableChildren;

    // Early return if no leaf nodes to check
    if (leafNodes.size === 0) {
      return;
    }

    // Check each child for leaf node ancestry and update focusability
    for (let i = 0; i < childrenLength; i++) {
      // biome-ignore lint/style/noNonNullAssertion: Already asserted that child exists
      const child = children[i]!;

      if (this._hasLeafParent(child.element, leafNodes, parentNode.element)) {
        child.element.focusable = false;

        if (parentNode.focusedElement === child) {
          parentNode.focusedElement = this._findNextBestFocus(
            parentNode,
            child,
          );
        }
      }
    }
  }

  private _hasLeafParent(
    element: T,
    leafNodes: Set<number>,
    parentNode: T | null,
  ): boolean {
    let curr: T | null = element.parent as T | null;

    while (curr && curr !== parentNode) {
      if (leafNodes.has(curr.id)) {
        return true;
      }

      curr = curr.parent as T | null;
    }

    return false;
  }

  private _findNextBestFocus(
    parent: FocusNode<T> | RootNode<T>,
    relativeNode?: FocusNode<T>,
  ): FocusNode<T> | null {
    if (parent.children.length === 0) {
      return null;
    }

    let bestMatch: FocusNode<T> | null = null;
    let relativeIndex = -1;

    if (relativeNode) {
      relativeIndex = parent.children.indexOf(relativeNode);
    }

    // Loop through from the beginning of the children, even if we want to
    // select an element relative to the relative node. This is to prevent
    // having to loop through twice.
    for (let i = 0; i < parent.children.length; i++) {
      const newChild = parent.children[i];

      if (
        newChild?.element.focusable &&
        !hasExternalRedirect(newChild) &&
        newChild !== relativeNode
      ) {
        if (i >= relativeIndex) {
          return newChild;
        }

        bestMatch = newChild;
      }
    }

    return bestMatch;
  }

  private _recalculateFocusPath(): void {
    const newPath: T[] = [];
    const layer = this.activeLayer;
    let curr: FocusNode<T> | null = layer.root.focusedElement;
    let divergenceIndex = 0;

    while (curr) {
      newPath.push(curr.element);

      if (newPath[divergenceIndex] === layer.focusPath[divergenceIndex]) {
        divergenceIndex++;
      }

      curr = curr.focusedElement;
    }

    // Only process elements that actually changed
    let changed = false;

    for (let i = layer.focusPath.length - 1; i >= divergenceIndex; i--) {
      const removedFocus = layer.focusPath[i];

      if (removedFocus?.focused) {
        removedFocus.blur();
        this._eventEmitter.emit('blurred', removedFocus);
      }

      changed = true;
    }

    for (let i = divergenceIndex; i < newPath.length; i++) {
      const addedFocus = newPath[i];

      if (addedFocus && !addedFocus.focused) {
        addedFocus.focus();
        this._eventEmitter.emit('focused', addedFocus);
      }

      changed = true;
    }

    if (changed) {
      layer.focusPath = newPath;
      this._eventEmitter.emit('focusPathChanged', newPath);
    }
  }
}

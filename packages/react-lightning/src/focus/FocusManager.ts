import { EventEmitter, type IEventEmitter } from 'tseep';

import type { Focusable } from '../types';
import type { EventNotifier } from '../types/EventNotifier';
import type { Traps } from './Traps';

type RootNode<T> = {
  element: null;
  children: FocusNode<T>[];
  focusedElement: FocusNode<T> | null;
  hasFocusableChildren: boolean;
  /**
   * True once focus has been explicitly committed into this node's subtree via
   * `focus()`/spatial navigation (as opposed to a mount-time default). While
   * committed, a later-mounting `autoFocus` child must not steal live focus on
   * registration — matching native `TVFocusGuideView`, which forwards focus on
   * arrival, not on mount.
   */
  focusCommitted: boolean;
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
  /** When true, focus navigation can target non-visible children (e.g. clipped items in a virtualized list). */
  allowOffscreen: boolean;
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

function hasExternalRedirect<T extends { parent?: T | null }>(node: FocusNode<T>): boolean {
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
> implements EventNotifier<FocusEvents<T>> {
  private _disposers: Map<T, (() => void)[]> = new Map();
  private _childFocusEventHandlers: Map<T, ((child: T) => void) | undefined> = new Map();
  private _focusStack: FocusLayer<T>[] = [];
  private _eventEmitter = new EventEmitter<FocusEvents<T>>();
  /**
   * A focus request whose target was not yet registered (or not yet focusable)
   * when `focus()` was called. Fulfilled the moment the element registers or
   * becomes focusable, so callers don't have to poll across frames waiting for
   * a node to mount/scroll into view. Last request wins.
   */
  private _pendingFocus: T | null = null;

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
          focusCommitted: false,
        },
        elements: new Map(),
        focusPath: [],
      },
    ];
  }

  public on = (...args: Parameters<IEventEmitter<FocusEvents<T>>['on']>): (() => void) => {
    this._eventEmitter.on(...args);

    return () => this._eventEmitter.off(...args);
  };
  public off: EventEmitter<FocusEvents<T>>['off'] = this._eventEmitter.off.bind(this._eventEmitter);
  public emit: EventEmitter<FocusEvents<T>>['emit'] = this._eventEmitter.emit.bind(
    this._eventEmitter,
  );

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
      allowOffscreen?: boolean;
    },
  ): void {
    const autoFocus = options?.autoFocus ?? false;
    const focusRedirect = options?.focusRedirect ?? false;
    const destinations = options?.destinations ?? null;
    const allowOffscreen = options?.allowOffscreen ?? false;
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
        const parentNodeInPreviousLayer: RootNode<T> | FocusNode<T> | undefined = this._focusStack
          .at(-2)
          ?.elements?.get?.(parent);

        if (parentNodeInPreviousLayer && !isRootNode(parentNodeInPreviousLayer)) {
          parentNode = this._addMissingParentsToCurrentLayer(parentNodeInPreviousLayer);
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
      childNode.allowOffscreen = allowOffscreen;

      // If the child node already exists, we need to remove it from its current parent
      if (childNode.parent !== parentNode) {
        const index = childNode.parent.children.indexOf(childNode);

        if (childNode.parent.focusedElement === childNode) {
          childNode.parent.focusedElement = this._findNextBestFocus(childNode.parent, childNode);
        }

        if (index !== -1) {
          childNode.parent.children.splice(index, 1);
          this._checkFocusableChildren(childNode.parent);
        }

        childNode.parent = parentNode;

        // If we weren't focusable before, assume we can be now and then check again
        if (!childNode.element.focusable) {
          childNode.element.focusable = true;
          this._checkFocusableChildren(parentNode);
        }
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
        allowOffscreen,
      );
    }

    if (parentNode.children.indexOf(childNode) === -1) {
      parentNode.children.push(childNode);
    }

    this._checkFocusableChildren(parentNode);

    if (this._isEffectivelyFocusable(childNode) && !hasExternalRedirect(childNode)) {
      if (!parentNode.focusedElement) {
        // No preferred child yet — take the slot regardless of autoFocus.
        parentNode.focusedElement = childNode;
      } else if (autoFocus && !parentNode.focusedElement.autoFocus && !parentNode.focusCommitted) {
        // An autoFocus child upgrades a non-autoFocus preferred child only
        // while focus hasn't been explicitly committed here. Once committed,
        // a later-mounting autoFocus child must not steal live focus (it would
        // diverge from native TVFocusGuideView, which forwards on arrival).
        parentNode.focusedElement = childNode;
      }
    }

    this._recalculateFocusPath();

    // If a focus request was waiting on this element to register, fulfill it
    // now that it's in the tree (and possibly focusable).
    this._tryFulfillPendingFocus(child);
  }

  private _forAllNodes(element: T, callback: (node: FocusNode<T>) => void): void {
    for (let i = this._focusStack.length - 1; i >= 0; i--) {
      const layer = this._focusStack[i];
      // oxlint-disable-next-line typescript/no-non-null-assertion -- Already asserted layer exists
      const node = layer!.elements.get(element);

      if (node) {
        callback(node);
      }
    }
  }

  public removeElement(element: T): void {
    if (this._pendingFocus === element) {
      this._pendingFocus = null;
    }

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
    this._forAllNodes(element, (node) => {
      node.focusRedirect = !!focusRedirect;
    });
  }

  public setDestinations(element: T, destinations?: (T | null)[]): void {
    this._forAllNodes(element, (node) => {
      node.destinations = destinations ?? null;
    });
  }

  public setAllowOffscreen(element: T, allowOffscreen?: boolean): void {
    this._forAllNodes(element, (node) => {
      node.allowOffscreen = !!allowOffscreen;
    });
  }

  public setOnChildFocused(element: T, onChildFocused?: (child: T) => void): void {
    if (onChildFocused) {
      this._childFocusEventHandlers.set(element, onChildFocused);
    } else {
      this._childFocusEventHandlers.delete(element);
    }
  }

  /**
   * Mark `element` as the preferred focus target of its immediate parent
   * without walking up the tree or stealing focus from elsewhere.
   *
   * Use case: a virtualised-list cell whose `shouldFocus` flips true on
   * slot recycle while the user is focused on a different subtree. The
   * parent's `focusedElement` may still point at a stale sibling slot
   * from the row this slot served previously, so the next time focus
   * actually traverses into this group it would land on the wrong cell.
   * Setting the parent's `focusedElement` here updates the tree so that
   * future traversal resolves correctly. `_recalculateFocusPath` is
   * still invoked: if the parent is already in the active focus path
   * (the user is on this group), focus moves from the old child to the
   * new one as expected; otherwise the path is unchanged and the user's
   * current focus is left alone.
   */
  public setFocusedChild(element: T): void {
    const node = this.activeLayer.elements.get(element);

    if (!node) {
      return;
    }

    if (!element.focusable || hasExternalRedirect(node)) {
      return;
    }

    if (node.parent.focusedElement === node) {
      return;
    }

    node.parent.focusedElement = node;
    this._recalculateFocusPath();
  }

  public pushLayer(): void {
    // A pending focus targets the layer it was requested in; drop it on a
    // layer change so it can't fulfill against the wrong layer.
    this._pendingFocus = null;

    // Store the current layer before creating new one
    const previousLayer = this.activeLayer;

    // Blur in reverse order (leaf-first) so children clean up before parents
    for (let i = previousLayer.focusPath.length - 1; i >= 0; i--) {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- bounds-checked loop
      const element = previousLayer.focusPath[i]!;

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
        focusCommitted: false,
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

    // A pending focus targets the layer it was requested in; drop it on a
    // layer change so it can't fulfill against the wrong layer.
    this._pendingFocus = null;

    // Get current layer info before popping
    const currentLayer = this.activeLayer;

    // Blur in reverse order (leaf-first) so children clean up before parents
    for (let i = currentLayer.focusPath.length - 1; i >= 0; i--) {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- bounds-checked loop
      const element = currentLayer.focusPath[i]!;

      if (element.focused) {
        element.blur();
        this._eventEmitter.emit('blurred', element);
      }
    }

    // oxlint-disable-next-line typescript/no-non-null-assertion -- Already checked above
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

    // Not registered yet, or registered but not focusable yet (e.g. just
    // mounted / scrolled into view, dimensions not measured). Queue the
    // request instead of dropping it; it resolves once the element is ready.
    if (!node || !element.focusable) {
      this._pendingFocus = element;

      return;
    }

    this._pendingFocus = null;
    this._focusNode(node);
  }

  /**
   * Fulfill a queued {@link focus} request for `element` if it is now
   * registered and focusable. No-op otherwise (it stays queued).
   */
  private _tryFulfillPendingFocus(element: T): void {
    if (this._pendingFocus !== element) {
      return;
    }

    const node = this.activeLayer.elements.get(element);

    if (node && element.focusable && !hasExternalRedirect(node)) {
      this._pendingFocus = null;
      this._focusNode(node);
    }
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

    return path.map((id) => (id === node.element.id.toString() ? `[${id}]` : id)).join(' > ');
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
      // oxlint-disable-next-line typescript/no-non-null-assertion -- Already asserted stack is not empty
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
    allowOffscreen = false,
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
      allowOffscreen,
      focusCommitted: false,
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
        // Look up the current node to avoid stale closure references
        // after re-parenting
        const currentNode = this.activeLayer.elements.get(element);

        if (!currentNode) {
          return;
        }

        if (!currentNode.parent.focusedElement) {
          currentNode.parent.focusedElement = this._findNextBestFocus(currentNode.parent);
        } else if (!isFocusable && currentNode.parent.focusedElement === currentNode) {
          currentNode.parent.focusedElement = this._findNextBestFocus(
            currentNode.parent,
            currentNode,
          );
        }

        this._checkFocusableChildren(currentNode.parent);
        this._recalculateFocusPath();

        // A queued focus request may have been waiting on this element to
        // become focusable.
        if (isFocusable) {
          this._tryFulfillPendingFocus(element);
        }
      }),
      element.on('focusChanged', (_, isFocused) => {
        if (isFocused && !element.focused) {
          const currentNode = this.activeLayer.elements.get(element);

          this.focus(element);

          if (currentNode) {
            this._tryEmitChildFocusedEvent(currentNode);
          }
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

  /**
   * Forward focus to the first resolvable destination of `node`, recursing
   * through any further redirects. Destinations that are unfocusable or no
   * longer registered (stale refs) are skipped. Returns true when focus was
   * redirected (or aborted on a cycle) and the caller should stop; false when
   * nothing resolved and the caller should focus `node` normally.
   */
  private _redirectToDestination(node: FocusNode<T>, visitedRedirects?: Set<T>): boolean {
    if (!node.destinations) {
      return false;
    }

    for (const destination of node.destinations) {
      // A destination can hold a stale ref (e.g. a recycled list cell that
      // unmounted after setDestinations); skip it like native TVFocusGuideView
      // drops invalid node handles, so focus falls back to the normal child.
      if (!destination?.focusable) {
        continue;
      }

      const focusNode = this.activeLayer.elements.get(destination);

      if (!focusNode) {
        continue;
      }

      // Detect redirect cycles
      const visited = visitedRedirects ?? new Set<T>();

      if (visited.has(destination)) {
        console.warn('FocusManager: Focus redirect cycle detected, aborting');

        return true;
      }

      visited.add(destination);

      this._focusNode(focusNode, visited);

      return true;
    }

    return false;
  }

  private _focusNode(childNode: FocusNode<T>, visitedRedirects?: Set<T>) {
    // On arrival, forward to a declared destination. With focusRedirect this
    // happens on every visit (a permanent redirect); without it, only on the
    // first visit (no remembered child yet) — matching native
    // TVFocusGuideView, which forwards focus on arrival then remembers the
    // last-focused child for subsequent visits.
    if (
      childNode.destinations &&
      (childNode.focusRedirect || !childNode.focusCommitted) &&
      this._redirectToDestination(childNode, visitedRedirects)
    ) {
      return;
    }

    let currParent = childNode.parent;
    let currChild: FocusNode<T> | RootNode<T> = childNode;

    if (currChild.children.length && !currChild.focusedElement) {
      currChild.focusedElement = this._findNextBestFocus(currChild);
    }

    // Focus has now explicitly arrived at this node, so mark its subtree as
    // committed: a later-mounting autoFocus sibling must not steal it on
    // registration (see addElement / focusCommitted).
    childNode.focusCommitted = true;

    while (currChild && !isRootNode(currChild) && currParent) {
      if (
        currChild.focusRedirect &&
        currChild.destinations &&
        this._redirectToDestination(currChild, visitedRedirects)
      ) {
        return;
      }

      currParent.focusedElement = currChild as FocusNode<T>;
      currParent.focusCommitted = true;
      currChild = currParent;
      currParent = 'parent' in currChild ? currChild.parent : this.activeLayer.root;
    }

    this._recalculateFocusPath();
    this._tryEmitChildFocusedEvent(childNode);
  }

  private _tryEmitChildFocusedEvent(node: FocusNode<T>) {
    if (!node.parent.element) {
      return;
    }

    const onChildFocused = this._childFocusEventHandlers.get(node.parent.element);

    if (onChildFocused) {
      onChildFocused(node.element);
    }
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
      // Removing a child can empty a focus-group parent; recompute so its
      // effective focusability and the ancestor chain update.
      if (!isRootNode(node.parent) && node.parent.element.isFocusGroup) {
        this._checkFocusableChildren(node.parent);
      }

      this._recalculateFocusPath();
    }

    if (this._childFocusEventHandlers.has(node.element)) {
      this._childFocusEventHandlers.delete(node.element);
    }

    this._removeEventListeners(node);
  }

  // A focus group only delegates, so it's a target only with a focusable
  // descendant. Leaves (Pressable, focusable View) always are.
  private _isEffectivelyFocusable(node: FocusNode<T>): boolean {
    if (!node.element.focusable) {
      return false;
    }

    return !node.element.isFocusGroup || node.hasFocusableChildren;
  }

  private _checkFocusableChildren(parentNode: FocusNode<T> | RootNode<T>) {
    const previous = parentNode.hasFocusableChildren;
    const children = parentNode.children;
    const childrenLength = children.length;

    const leafNodes = new Set<number>();
    let hasFocusableChildren = false;

    for (let i = 0; i < childrenLength; i++) {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- Already asserted that child exists
      const child = children[i]!;

      if (this._isEffectivelyFocusable(child)) {
        hasFocusableChildren = true;
      }

      if (child.children.length === 0) {
        leafNodes.add(child.element.id);
      }
    }

    parentNode.hasFocusableChildren = hasFocusableChildren;

    // Check each child for leaf node ancestry and update focusability
    if (leafNodes.size > 0) {
      for (let i = 0; i < childrenLength; i++) {
        // oxlint-disable-next-line typescript/no-non-null-assertion -- Already asserted that child exists
        const child = children[i]!;

        if (this._hasLeafParent(child.element, leafNodes, parentNode.element)) {
          child.element.focusable = false;

          if (parentNode.focusedElement === child) {
            parentNode.focusedElement = this._findNextBestFocus(parentNode, child);
          }
        }
      }
    }

    // A group's effective focusability tracks hasFocusableChildren, so a flip
    // here has to refresh the ancestor chain (non-group parents don't).
    if (
      previous !== hasFocusableChildren &&
      !isRootNode(parentNode) &&
      parentNode.element.isFocusGroup
    ) {
      this._propagateFocusableChange(parentNode);
    }
  }

  private _propagateFocusableChange(node: FocusNode<T>) {
    const parent = node.parent;

    if (this._isEffectivelyFocusable(node)) {
      if (!parent.focusedElement && !hasExternalRedirect(node)) {
        parent.focusedElement = node;
      }
    } else if (parent.focusedElement === node) {
      parent.focusedElement = this._findNextBestFocus(parent, node);
    }

    this._checkFocusableChildren(parent);
  }

  private _hasLeafParent(element: T, leafNodes: Set<number>, parentNode: T | null): boolean {
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
        newChild &&
        this._isEffectivelyFocusable(newChild) &&
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
    const layer = this.activeLayer;
    const oldPath = layer.focusPath;

    // Quick check: walk the focused chain and compare against old path.
    // If every element matches and lengths are equal, nothing changed.
    let curr: FocusNode<T> | null = layer.root.focusedElement;
    let newLength = 0;
    let divergenceIndex = 0;
    let pathMatches = true;

    while (curr) {
      if (pathMatches && oldPath[newLength] === curr.element) {
        divergenceIndex = newLength + 1;
      } else {
        pathMatches = false;
      }
      newLength++;
      curr = curr.focusedElement;
    }

    // If entire path matches and same length, nothing to do
    if (pathMatches && newLength === oldPath.length) {
      return;
    }

    // Build new path only when we know it changed
    // oxlint-disable-next-line unicorn/no-new-array -- pre-allocated array filled in the loop below
    const newPath: T[] = new Array(newLength);

    curr = layer.root.focusedElement;

    for (let i = 0; i < newLength; i++) {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- curr is non-null for newLength iterations
      newPath[i] = curr!.element;
      // oxlint-disable-next-line typescript/no-non-null-assertion -- curr is non-null for newLength iterations
      curr = curr!.focusedElement;
    }

    const oldLeaf = oldPath.length > 0 ? (oldPath[oldPath.length - 1] ?? null) : null;
    const newLeaf = newLength > 0 ? (newPath[newLength - 1] ?? null) : null;
    const leafChanged = oldLeaf !== newLeaf;

    // Blur removed elements (leaf-first)
    for (let i = oldPath.length - 1; i >= divergenceIndex; i--) {
      const removedFocus = oldPath[i];

      if (removedFocus?.focused) {
        removedFocus.blur();
        this._eventEmitter.emit('blurred', removedFocus);
      }
    }

    if (leafChanged && oldLeaf) {
      this._bubbleFocusEvent('blur', oldLeaf, oldPath, divergenceIndex);
    }

    // Focus newly added elements (root-first)
    for (let i = divergenceIndex; i < newPath.length; i++) {
      const addedFocus = newPath[i];

      if (addedFocus && !addedFocus.focused) {
        addedFocus.focus();
        this._eventEmitter.emit('focused', addedFocus);
      }
    }

    if (leafChanged && newLeaf) {
      this._bubbleFocusEvent('focus', newLeaf, newPath, divergenceIndex);
    }

    layer.focusPath = newPath;
    this._eventEmitter.emit('focusPathChanged', newPath);
  }

  /**
   * tvOS/web bubble focus through plain wrapper views; the focus path only reaches focus nodes,
   * so deliver to the remaining ancestors (skip at/past `divergenceIndex`, they fired their own).
   */
  private _bubbleFocusEvent(type: 'focus' | 'blur', target: T, path: T[], divergenceIndex: number): void {
    let curr: T | null | undefined = target.parent;

    while (curr) {
      if (path.indexOf(curr, divergenceIndex) === -1) {
        curr.bubbleFocusEvent?.(type, target);
      }

      curr = curr.parent;
    }
  }
}

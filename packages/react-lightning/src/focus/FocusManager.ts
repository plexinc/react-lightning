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
  destinationKeys?: readonly string[] | null;
  exits?: FocusExits | null;
  traps: Traps;
  hasFocusableChildren: boolean;
  /** When true, focus navigation can target non-visible children (e.g. clipped items in a virtualized list). */
  allowOffscreen: boolean;
  /**
   * When true, this node is reachable only by a deliberate directional move,
   * never by restoration: it's excluded from fallback selection when a focused
   * sibling unmounts and from the mount-time default. Mirrors the intent of
   * tvOS `isTVFocusRestorationExcluded` (e.g. an edge-guard focus catcher that
   * must not steal focus on launch).
   */
  focusRestorationExcluded: boolean;
  focusEntry?: FocusEntry | null;
  rememberAs?: string | null;
  remembered?: Map<string, FocusNode<T>> | null;
  /** Keyed by focus key because a recycling list reuses its cells, so a remembered node can show another item later. */
  rememberedLeafKeys?: Map<string, string> | null;
  scope?: boolean;
  scopeActive?: boolean;
  scopeClaimed?: boolean;
  scopeClaimTarget?: FocusNode<T> | null;
  scopeRefocusUntil?: number;
  initialFocus?: number | null;
};

export type FocusEntry = 'first' | 'last-focused' | 'spatial';

export type FocusRect = { x: number; y: number; w: number; h: number };

export type FocusMeasure<T> = (element: T, out: FocusRect) => boolean;

export type FocusElementOptions<T> = {
  autoFocus?: boolean;
  focusRedirect?: boolean;
  destinations?: (T | null)[] | null;
  traps?: Traps;
  allowOffscreen?: boolean;
  focusRestorationExcluded?: boolean;
  destinationKeys?: readonly string[] | null;
  exits?: FocusExits | null;
  focusKey?: string | null;
  focusEntry?: FocusEntry | null;
  rememberAs?: string | null;
  scope?: boolean;
  scopeActive?: boolean;
  initialFocus?: number | null;
  onChildFocused?: ((child: T) => void) | null;
  onFocusEnter?: (() => void) | null;
  onFocusLeave?: (() => void) | null;
};

export type FocusExits = {
  up?: string;
  right?: string;
  down?: string;
  left?: string;
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

function defaultMeasure(element: unknown, out: FocusRect): boolean {
  const el = element as {
    node?: { w: number; h: number };
    getRelativePosition?: (relativeTo: null) => { x: number; y: number };
  };

  if (!el.node || !el.getRelativePosition) {
    return false;
  }

  const { x, y } = el.getRelativePosition(null);
  out.x = x;
  out.y = y;
  out.w = el.node.w;
  out.h = el.node.h;

  return true;
}

const CLAIM_HOLD_MS = 1000;

interface DeferredRepick<T extends Focusable> {
  parent: FocusNode<T>;
  rect: FocusRect;
  fallback: FocusNode<T> | null;
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

  /**
   * Preferred-child requests whose target was not yet registered (or not yet
   * focusable) when `setFocusedChild()` was called — a React child effect runs
   * before its element is attached to the focus tree. Fulfilled per element the
   * moment it becomes usable, so a group's remembered child can be set up front
   * rather than after mount. Unlike focus, a preference is not exclusive: one
   * per element, each resolving against its own parent.
   */
  private _pendingPreferredChildren: Set<T> = new Set();
  private _keyedElements: Map<string, T> = new Map();
  private _elementKeys: Map<T, string> = new Map();
  private _boundaryHandlers: Map<T, { enter?: () => void; leave?: () => void }> = new Map();
  private _initialGroups: FocusNode<T>[] = [];
  private _claiming: Set<FocusNode<T>> = new Set();
  private _currentScope: FocusNode<T> | null = null;
  private _measure: FocusMeasure<T>;
  private _batchInitialFocus: boolean;
  private _initialFocusPending = false;
  private _deferredRepicks: DeferredRepick<T>[] = [];
  private _rememberingNodes = 0;
  private _claimHoldUntil = 0;
  private _claimHoldTimer: ReturnType<typeof setTimeout> | null = null;
  private _refocusTimer: ReturnType<typeof setTimeout> | null = null;
  private _scratchRect: FocusRect = { x: 0, y: 0, w: 0, h: 0 };
  private _lastRect: FocusRect = { x: 0, y: 0, w: 0, h: 0 };
  private _lastRectNode: FocusNode<T> | null = null;

  public get activeLayer(): FocusLayer<T> {
    if (this._focusStack.length === 0) {
      throw new Error('No more focus stacks! This should not occur');
    }

    return this._focusStack[this._focusStack.length - 1] as FocusLayer<T>;
  }

  public get focusPath(): T[] {
    return this.activeLayer.focusPath;
  }

  /** Off by default because focus then resolves in a microtask instead of inside `addElement`. */
  public constructor(options?: { measure?: FocusMeasure<T>; batchInitialFocus?: boolean }) {
    this._measure = options?.measure ?? defaultMeasure;
    this._batchInitialFocus = options?.batchInitialFocus ?? false;
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

  public addElement(child: T, parent?: T | null, options?: FocusElementOptions<T>): void {
    const autoFocus = options?.autoFocus ?? false;
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
      childNode = this._createFocusNode(child, parentNode);
    }

    this._applyOptions(childNode, options, false);

    if (parentNode.children.indexOf(childNode) === -1) {
      parentNode.children.push(childNode);
    }

    this._checkFocusableChildren(parentNode);

    if (
      this._isEffectivelyFocusable(childNode) &&
      !hasExternalRedirect(childNode) &&
      !childNode.focusRestorationExcluded
    ) {
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

    this._recalculateAfterAdd();

    // If a focus request or preferred-child preference was waiting on this
    // element to register, fulfill it now that it's in the tree (and possibly
    // focusable).
    this._tryFulfillPendingPreferredChild(child);
    this._tryFulfillPendingFocus(child);
    this._runClaimsAfterAdd();
  }

  /** Unlike the `set*` methods this replaces every option, so a field left out is cleared. */
  public updateElement(element: T, options: FocusElementOptions<T>): void {
    const node = this.activeLayer.elements.get(element);

    this._forAllNodes(element, (found) => {
      if (found !== node) {
        this._applyFields(found, options);
      }
    });

    if (node) {
      this._applyOptions(node, options, true);
      this._recalculateFocusPath();
      this._runClaims();
    }
  }

  public setHandlers(
    element: T,
    handlers: Pick<FocusElementOptions<T>, 'onChildFocused' | 'onFocusEnter' | 'onFocusLeave'>,
  ): void {
    this.setOnChildFocused(element, handlers.onChildFocused ?? undefined);
    this._setBoundaryHandlers(element, handlers.onFocusEnter, handlers.onFocusLeave);
  }

  private _applyFields(node: FocusNode<T>, o: FocusElementOptions<T> | undefined): void {
    node.autoFocus = o?.autoFocus ?? false;
    node.focusRedirect = o?.focusRedirect ?? false;
    node.destinations = o?.destinations ?? null;
    node.traps = o?.traps ?? node.traps;
    node.allowOffscreen = o?.allowOffscreen ?? false;
    node.focusRestorationExcluded = o?.focusRestorationExcluded ?? false;
    node.destinationKeys = o?.destinationKeys?.length ? o.destinationKeys : null;
    node.exits = o?.exits && Object.keys(o.exits).length ? o.exits : null;
    node.focusEntry = o?.focusEntry ?? null;
  }

  private _applyOptions(
    node: FocusNode<T>,
    o: FocusElementOptions<T> | undefined,
    isUpdate: boolean,
  ): void {
    const { element } = node;

    this._applyFields(node, o);

    // `set*` callers (and updates from the polyfill plugin) rely on a plain
    // addElement not wiping what they set, so only an update clears these.
    if (isUpdate || o?.focusKey !== undefined) {
      this.setFocusKey(element, o?.focusKey);
    }

    if (isUpdate || o?.onChildFocused !== undefined) {
      this.setOnChildFocused(element, o?.onChildFocused ?? undefined);
    }

    if (isUpdate || o?.onFocusEnter !== undefined || o?.onFocusLeave !== undefined) {
      this._setBoundaryHandlers(element, o?.onFocusEnter, o?.onFocusLeave);
    }

    this._applyRememberAs(node, o?.rememberAs ?? null);
    this._applyInitialFocus(node, o?.initialFocus ?? null);
    this._applyScope(node, !!o?.scope, o?.scopeActive ?? true);
  }

  private _setBoundaryHandlers(
    element: T,
    enter?: (() => void) | null,
    leave?: (() => void) | null,
  ): void {
    if (enter || leave) {
      this._boundaryHandlers.set(element, { enter: enter ?? undefined, leave: leave ?? undefined });
    } else {
      this._boundaryHandlers.delete(element);
    }
  }

  private _applyRememberAs(node: FocusNode<T>, next: string | null): void {
    const previous = node.rememberAs ?? null;

    if (previous === next) {
      return;
    }

    node.rememberAs = next;
    this._rememberingNodes += (next === null ? 0 : 1) - (previous === null ? 0 : 1);

    if (!node.remembered && !node.focusedElement) {
      return;
    }

    const remembered = (node.remembered ??= new Map());

    if (node.focusedElement) {
      remembered.set(previous ?? '', node.focusedElement);
    }

    const restored = remembered.get(next ?? '');
    const usable =
      restored &&
      restored.parent === node &&
      this.activeLayer.elements.get(restored.element) === restored &&
      this._isEffectivelyFocusable(restored)
        ? restored
        : null;

    if (!usable) {
      node.focusedElement = this._findNextBestFocus(node, undefined, true);
      this._resetFocusedChain(node.focusedElement);

      return;
    }

    node.focusedElement = usable;
    this._restoreLeafByKey(node, node.rememberedLeafKeys?.get(next ?? ''));
  }

  private _resetFocusedChain(from: FocusNode<T> | null): void {
    for (let nested = from; nested?.children.length; ) {
      nested = nested.focusedElement = this._findNextBestFocus(nested, undefined, true);
    }
  }

  private _restoreLeafByKey(node: FocusNode<T>, key: string | undefined): void {
    const element = key === undefined ? undefined : this._keyedElements.get(key);
    const leaf = element && this.activeLayer.elements.get(element);

    if (!leaf || !this._isEffectivelyFocusable(leaf)) {
      return;
    }

    for (let curr: FocusNode<T> | RootNode<T> = leaf; !isRootNode(curr); curr = curr.parent) {
      if (curr.parent === node) {
        for (let link: FocusNode<T> = leaf; link !== curr; link = link.parent as FocusNode<T>) {
          (link.parent as FocusNode<T>).focusedElement = link;
        }

        node.focusedElement = curr;

        return;
      }
    }
  }

  private _applyInitialFocus(node: FocusNode<T>, priority: number | null): void {
    node.initialFocus = priority;

    const index = this._initialGroups.indexOf(node);

    if (priority === null) {
      if (index !== -1) {
        this._initialGroups.splice(index, 1);
      }
    } else if (index === -1) {
      this._initialGroups.push(node);
    }
  }

  private _applyScope(node: FocusNode<T>, scope: boolean, active: boolean): void {
    const wasActive = !!node.scope && !!node.scopeActive;

    node.scope = scope;
    node.scopeActive = scope && active;

    if (!scope) {
      this._claiming.delete(node);

      return;
    }

    if (!active) {
      this._claiming.delete(node);
    }

    if (wasActive || !active) {
      return;
    }

    this._currentScope = node;

    if (!node.scopeClaimed) {
      node.scopeClaimed = true;
      this._claiming.add(node);
    } else if (!node.element.focused && node.hasFocusableChildren) {
      this._focusNode(node);
    }
  }

  private _nearestScope(node: FocusNode<T>): FocusNode<T> | null {
    let curr = node.parent;

    while (!isRootNode(curr)) {
      if (curr.scope) {
        return curr;
      }

      curr = curr.parent;
    }

    return null;
  }

  private _runClaims(): void {
    if (this._claiming.size === 0) {
      return;
    }

    for (const scope of this._claiming) {
      this._runClaim(scope);
    }
  }

  private _awaitsDestination(node: FocusNode<T>): boolean {
    for (const key of node.destinationKeys ?? []) {
      if (key === 'first' || key === 'last-focused') {
        continue;
      }

      const element = this._keyedElements.get(key);

      if (element && this.activeLayer.elements.has(element)) {
        return !element.focusable;
      }
    }

    return false;
  }

  private _bestClaim(scope: FocusNode<T>): FocusNode<T> | null {
    const { elements } = this.activeLayer;
    let best: FocusNode<T> | null = null;

    for (const group of this._initialGroups) {
      if (
        elements.get(group.element) !== group ||
        this._nearestScope(group) !== scope ||
        (best && (group.initialFocus ?? 0) <= (best.initialFocus ?? 0))
      ) {
        continue;
      }

      best = group;
    }

    return best;
  }

  /** Holds the default pick back while a claim's winner has no content, so the first item doesn't flash focus. Bounded so focus can't be stranded. */
  private _holdsForClaim(): boolean {
    if (this._claiming.size === 0 || this.activeLayer.focusPath.length > 0) {
      return false;
    }

    let pending = false;

    for (const scope of this._claiming) {
      const best = scope.scopeActive ? this._bestClaim(scope) : null;

      if (best && scope.scopeClaimTarget !== best) {
        pending = true;
        break;
      }
    }

    if (!pending) {
      return false;
    }

    const now = Date.now();

    if (this._claimHoldUntil === 0) {
      this._claimHoldUntil = now + CLAIM_HOLD_MS;
      this._claimHoldTimer = setTimeout(() => {
        this._claimHoldTimer = null;
        this._recalculateFocusPath();
      }, CLAIM_HOLD_MS);
    }

    return now < this._claimHoldUntil;
  }

  private _runClaim(scope: FocusNode<T>): void {
    if (!scope.scopeActive || this.activeLayer.elements.get(scope.element) !== scope) {
      return;
    }

    const best = this._bestClaim(scope);

    if (!best || scope.scopeClaimTarget === best) {
      return;
    }

    if (!this._isEffectivelyFocusable(best) || this._awaitsDestination(best)) {
      return;
    }

    scope.scopeClaimTarget = best;
    this._focusNode(best);
  }

  public get hasInitialClaim(): boolean {
    return this._claiming.size > 0;
  }

  public endInitialClaims(): void {
    if (this._claiming.size === 0) {
      return;
    }

    this._claiming.clear();
  }

  public refocusInitial(): void {
    const scope = this._currentScope;

    if (!scope || this.activeLayer.elements.get(scope.element) !== scope) {
      return;
    }

    scope.scopeClaimTarget = null;
    scope.scopeRefocusUntil = Date.now() + CLAIM_HOLD_MS;
    this._claiming.add(scope);
    this._runClaim(scope);
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

  /** One element per key, the last to register wins. */
  public setFocusKey(element: T, key?: string | null): void {
    const previous = this._elementKeys.get(element);

    if (previous === key) {
      return;
    }

    if (previous !== undefined) {
      this._elementKeys.delete(element);

      if (this._keyedElements.get(previous) === element) {
        this._keyedElements.delete(previous);
      }
    }

    if (key) {
      this._elementKeys.set(element, key);
      this._keyedElements.set(key, element);
    }
  }

  public getElementByKey(key: string): T | null {
    return this._keyedElements.get(key) ?? null;
  }

  public focusByKey(key: string): boolean {
    const element = this._keyedElements.get(key);

    if (!element || !this.activeLayer.elements.has(element)) {
      return false;
    }

    this.focus(element);

    return element.focused;
  }

  public setDestinationKeys(element: T, keys?: readonly string[] | null): void {
    this._forAllNodes(element, (node) => {
      node.destinationKeys = keys?.length ? keys : null;
    });
  }

  public setExits(element: T, exits?: FocusExits | null): void {
    this._forAllNodes(element, (node) => {
      node.exits = exits && Object.keys(exits).length ? exits : null;
    });
  }

  public removeElement(element: T): void {
    this.setFocusKey(element, null);

    if (this._pendingFocus === element) {
      this._pendingFocus = null;
    }

    this._pendingPreferredChildren.delete(element);

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

    // Not registered yet, or registered but not focusable yet. Queue the
    // preference instead of dropping it; it resolves once the element is ready.
    if (!node || !element.focusable) {
      this._pendingPreferredChildren.add(element);

      return;
    }

    this._pendingPreferredChildren.delete(element);

    if (hasExternalRedirect(node)) {
      return;
    }

    if (node.parent.focusedElement === node) {
      return;
    }

    node.parent.focusedElement = node;
    this._recalculateFocusPath();
  }

  public pushLayer(): void {
    // A pending focus or preferred-child preference targets the layer it was
    // requested in; drop it on a layer change so it can't fulfill against the
    // wrong layer.
    this._pendingFocus = null;
    this._pendingPreferredChildren.clear();

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

    // A pending focus or preferred-child preference targets the layer it was
    // requested in; drop it on a layer change so it can't fulfill against the
    // wrong layer.
    this._pendingFocus = null;
    this._pendingPreferredChildren.clear();

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
  /**
   * Apply a queued {@link setFocusedChild} preference for `element` if it is
   * now registered and focusable. No-op otherwise (it stays queued).
   */
  private _tryFulfillPendingPreferredChild(element: T): void {
    if (!this._pendingPreferredChildren.has(element)) {
      return;
    }

    const node = this.activeLayer.elements.get(element);

    if (!node || !element.focusable) {
      return;
    }

    this._pendingPreferredChildren.delete(element);

    if (hasExternalRedirect(node) || node.parent.focusedElement === node) {
      return;
    }

    node.parent.focusedElement = node;
    this._recalculateFocusPath();
  }

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

  private _createFocusNode(element: T, parent: FocusNode<T> | RootNode<T>) {
    const node: FocusNode<T> = {
      element,
      children: [],
      parent,
      focusedElement: null,
      autoFocus: false,
      focusRedirect: false,
      destinations: null,
      traps: { up: false, right: false, down: false, left: false },
      hasFocusableChildren: false,
      allowOffscreen: false,
      focusRestorationExcluded: false,
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
          if (this._canDeferRepick(currentNode)) {
            this._deferRepick(currentNode);
          } else {
            currentNode.parent.focusedElement = this._findNearestFocus(
              currentNode.parent,
              currentNode,
            );
          }
        }

        if (!this._isRepickDeferred(currentNode.parent)) {
          this._checkFocusableChildren(currentNode.parent);

          if (this._batchInitialFocus && isFocusable) {
            this._runClaims();
          }

          this._recalculateFocusPath();
        }

        // A queued focus request or preferred-child preference may have been
        // waiting on this element to become focusable.
        if (isFocusable) {
          this._tryFulfillPendingPreferredChild(element);
          this._tryFulfillPendingFocus(element);
        }

        this._runClaims();
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
  private *_destinationCandidates(node: FocusNode<T>): Iterable<T | null> {
    for (const key of node.destinationKeys ?? []) {
      if (key === 'first') {
        yield this._findNextBestFocus(node, undefined, true)?.element ?? null;
      } else if (key === 'last-focused') {
        // focusedElement also holds the default pick of a group that never had focus.
        yield node.focusCommitted ? (node.focusedElement?.element ?? null) : null;
      } else {
        yield this._keyedElements.get(key) ?? null;
      }
    }

    yield* node.destinations ?? [];
  }

  private _redirectToDestination(node: FocusNode<T>, visitedRedirects?: Set<T>): boolean {
    if (!node.destinations && !node.destinationKeys) {
      return false;
    }

    for (const destination of this._destinationCandidates(node)) {
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
    // On arrival, forward to a declared destination — on every visit, not just
    // the first. `destinations` takes precedence over the remembered child,
    // matching native TVFocusGuideView `destinations` (a reopened nav drawer
    // returns to its selected item). `autoFocus` is the separate first-then-
    // remember mechanism, resolved via the group's `focusedElement` below.
    if (
      (childNode.destinations || childNode.destinationKeys) &&
      this._redirectToDestination(childNode, visitedRedirects)
    ) {
      return;
    }

    let currParent = childNode.parent;
    let currChild: FocusNode<T> | RootNode<T> = childNode;

    if (
      currChild.children.length &&
      (!currChild.focusedElement || currChild.focusEntry === 'first')
    ) {
      currChild.focusedElement = this._findNextBestFocus(currChild, undefined, true);
    }

    // A nested group that always enters at its first child starts over too,
    // unless the group being entered returns to the exact item it remembered.
    if (currChild.focusEntry !== 'last-focused') {
      for (let nested = currChild.focusedElement; nested; nested = nested.focusedElement) {
        if (nested.focusEntry === 'first' && nested.children.length) {
          nested.focusedElement = this._findNextBestFocus(nested, undefined, true);
        }
      }
    }

    // Focus has now explicitly arrived at this node, so mark its subtree as
    // committed: a later-mounting autoFocus sibling must not steal it on
    // registration (see addElement / focusCommitted).
    childNode.focusCommitted = true;

    // A group hears onChildFocused whenever its own directly-focused child
    // changes — not only the group directly above the leaf. Otherwise a
    // VirtualList never learns focus crossed a cell when the cell nests its own
    // focus group, and its scroll-to-focus stops following. Matches tvOS, where
    // every ancestor is notified as focus crosses its children.
    const childFocusChanged: FocusNode<T>[] = [];

    while (currChild && !isRootNode(currChild) && currParent) {
      // Only hand focus off to an external redirect while walking up. An
      // internal redirect (destinations within this node's own subtree, e.g.
      // an EPG airings guide pointing at its own cells) is already satisfied by
      // the downward-arrival redirect above; re-firing it here would target a
      // descendant we just came from and self-cycle, aborting the focus move.
      if (
        hasExternalRedirect(currChild) &&
        this._redirectToDestination(currChild, visitedRedirects)
      ) {
        return;
      }

      if (currParent.focusedElement !== currChild) {
        childFocusChanged.push(currChild as FocusNode<T>);
      }

      currParent.focusedElement = currChild as FocusNode<T>;
      currParent.focusCommitted = true;
      currChild = currParent;
      currParent = 'parent' in currChild ? currChild.parent : this.activeLayer.root;
    }

    this._recalculateFocusPath();

    for (const node of childFocusChanged) {
      this._tryEmitChildFocusedEvent(node);
    }
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
    // A region that unmounts while focused hears no leave.
    this._boundaryHandlers.delete(node.element);

    // Remove all the children too
    for (const child of node.children) {
      this._removeNode(child, false);
    }

    // Picked while the node is still in its parent's children, so the next one is relative to where it was.
    if (isTopMostParentNode && node.parent.focusedElement === node) {
      if (this._canDeferRepick(node)) {
        this._deferRepick(node);
      } else {
        node.parent.focusedElement = this._findNearestFocus(node.parent, node);
      }
    }

    const removeIndex = node.parent.children.indexOf(node);

    if (removeIndex !== -1) {
      node.parent.children.splice(removeIndex, 1);
    }

    this.activeLayer.elements.delete(node.element);

    if (isTopMostParentNode && !this._isRepickDeferred(node.parent)) {
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

    if (node.initialFocus != null) {
      this._applyInitialFocus(node, null);
    }

    if (node.rememberAs != null) {
      this._rememberingNodes--;
    }

    if (node.scope) {
      this._claiming.delete(node);

      if (this._currentScope === node) {
        this._currentScope = null;
      }
    }

    if (this._lastRectNode === node) {
      this._lastRectNode = null;
    }

    this._removeEventListeners(node);
  }

  // A focus group only delegates, so it's a target only with a focusable
  // descendant. Leaves (Pressable, focusable View) always are.
  private _isEffectivelyFocusable(node: FocusNode<T>): boolean {
    if (!node.element.focusable) {
      return false;
    }

    // An empty redirect with destinations is a target too, it forwards on arrival.
    return (
      !node.element.isFocusGroup ||
      node.hasFocusableChildren ||
      (node.focusRedirect && !!(node.destinationKeys || node.destinations))
    );
  }

  private _checkFocusableChildren(parentNode: FocusNode<T> | RootNode<T>) {
    // The new items of a re-rendered list aren't focusable yet, so the settle checks later.
    if (this._isRepickDeferred(parentNode)) {
      return;
    }

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
      if (!parent.focusedElement && !hasExternalRedirect(node) && !node.focusRestorationExcluded) {
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
    // Restoration-excluded nodes are skipped for fallback/restoration picks,
    // but included when focus arrives at a group deliberately (directional).
    includeRestorationExcluded = false,
  ): FocusNode<T> | null {
    if (parent.children.length === 0) {
      return null;
    }

    if (!relativeNode) {
      return this._findFirstFocus(parent, includeRestorationExcluded);
    }

    let bestMatch: FocusNode<T> | null = null;
    let relativeIndex = parent.children.indexOf(relativeNode);

    // Loop through from the beginning of the children, even if we want to
    // select an element relative to the relative node. This is to prevent
    // having to loop through twice.
    for (let i = 0; i < parent.children.length; i++) {
      const newChild = parent.children[i];

      if (
        newChild &&
        this._isEffectivelyFocusable(newChild) &&
        !hasExternalRedirect(newChild) &&
        (includeRestorationExcluded || !newChild.focusRestorationExcluded) &&
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

  /** Children register in mount order, which isn't visual order once a list recycles its cells. */
  private _findFirstFocus(
    parent: FocusNode<T> | RootNode<T>,
    includeRestorationExcluded: boolean,
  ): FocusNode<T> | null {
    const scratch = this._scratchRect;
    let firstEligible: FocusNode<T> | null = null;
    let best: FocusNode<T> | null = null;
    let bestX = 0;
    let bestY = 0;

    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i] as FocusNode<T>;

      if (
        !this._isEffectivelyFocusable(child) ||
        hasExternalRedirect(child) ||
        (!includeRestorationExcluded && child.focusRestorationExcluded)
      ) {
        continue;
      }

      firstEligible ??= child;

      if (!this._measure(child.element, scratch)) {
        continue;
      }

      if (!best || scratch.y < bestY || (scratch.y === bestY && scratch.x < bestX)) {
        best = child;
        bestX = scratch.x;
        bestY = scratch.y;
      }
    }

    return best ?? firstEligible;
  }

  private _ownsLastRect(node: FocusNode<T>): boolean {
    for (let curr: FocusNode<T> | null = this._lastRectNode; curr; ) {
      if (curr === node) {
        return true;
      }

      curr = isRootNode(curr.parent) ? null : curr.parent;
    }

    return false;
  }

  private _findNearestFocus(
    parent: FocusNode<T> | RootNode<T>,
    relativeNode: FocusNode<T>,
  ): FocusNode<T> | null {
    if (!this._ownsLastRect(relativeNode)) {
      return this._findNextBestFocus(parent, relativeNode);
    }

    return (
      this._nearestTo(parent, relativeNode, this._lastRect) ??
      this._findNextBestFocus(parent, relativeNode)
    );
  }

  /** The focusable child whose centre is closest to `last`; on a tie the one further along wins. */
  private _nearestTo(
    parent: FocusNode<T> | RootNode<T>,
    exclude: FocusNode<T> | null,
    last: FocusRect,
  ): FocusNode<T> | null {
    const scratch = this._scratchRect;
    const cx = last.x + last.w / 2;
    const cy = last.y + last.h / 2;
    let best: FocusNode<T> | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestAfter = false;

    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i] as FocusNode<T>;

      if (
        child === exclude ||
        child.focusRestorationExcluded ||
        !this._isEffectivelyFocusable(child) ||
        hasExternalRedirect(child) ||
        !this._measure(child.element, scratch)
      ) {
        continue;
      }

      const dx = scratch.x + scratch.w / 2 - cx;
      const dy = scratch.y + scratch.h / 2 - cy;
      const distance = dx * dx + dy * dy;
      const after = dx > 0 || dy > 0;

      if (distance < bestDistance || (distance === bestDistance && after && !bestAfter)) {
        best = child;
        bestDistance = distance;
        bestAfter = after;
      }
    }

    return best;
  }

  private _recalculateAfterAdd(): void {
    if (!this._batchInitialFocus) {
      this._recalculateFocusPath();

      return;
    }

    if (this.activeLayer.focusPath.length > 0) {
      this._recalculateFocusPath();
    } else {
      this._scheduleSettle();
    }
  }

  private _runClaimsAfterAdd(): void {
    if (this._batchInitialFocus) {
      this._scheduleSettle();
    } else {
      this._runClaims();
    }
  }

  /** Bounded, so a target that never mounts can't strand focus. */
  private _refocusPending(node: FocusNode<T> | RootNode<T>): boolean {
    for (let curr = node; !isRootNode(curr); curr = curr.parent) {
      if (curr.scope) {
        return (
          this._claiming.has(curr) &&
          !curr.scopeClaimTarget &&
          (curr.scopeRefocusUntil ?? 0) > Date.now()
        );
      }
    }

    return false;
  }

  private _canDeferRepick(node: FocusNode<T>): boolean {
    return (
      this._batchInitialFocus &&
      !isRootNode(node.parent) &&
      this.activeLayer.focusPath.includes(node.element) &&
      (this._ownsLastRect(node) || this._refocusPending(node))
    );
  }

  private _deferRepick(node: FocusNode<T>): void {
    this._deferredRepicks.push({
      parent: node.parent as FocusNode<T>,
      rect: { ...this._lastRect },
      fallback: this._findNearestFocus(node.parent, node),
    });
    this._scheduleSettle();
  }

  private _isRepickDeferred(parent: FocusNode<T> | RootNode<T>): boolean {
    for (let i = 0; i < this._deferredRepicks.length; i++) {
      if (this._deferredRepicks[i]?.parent === parent) {
        return true;
      }
    }

    return false;
  }

  private _settleRepicks(): void {
    const repicks = this._deferredRepicks;

    if (repicks.length === 0) {
      return;
    }

    this._deferredRepicks = [];

    for (const repick of repicks) {
      const { parent, rect, fallback } = repick;

      if (this.activeLayer.elements.get(parent.element) !== parent) {
        continue;
      }

      const current = parent.focusedElement;

      if (current && this.activeLayer.elements.get(current.element) === current) {
        continue;
      }

      if (this._refocusPending(parent)) {
        this._deferredRepicks.push(repick);
        this._armRefocusTimer(parent);

        continue;
      }

      const registered = fallback && this.activeLayer.elements.get(fallback.element) === fallback;

      parent.focusedElement =
        this._nearestTo(parent, null, rect) ??
        (registered ? fallback : this._findFirstFocus(parent, false));
      this._checkFocusableChildren(parent);
    }
  }

  private _armRefocusTimer(scope: FocusNode<T> | RootNode<T>): void {
    if (this._refocusTimer !== null) {
      return;
    }

    let until = 0;

    for (let curr = scope; !isRootNode(curr); curr = curr.parent) {
      if (curr.scope) {
        until = curr.scopeRefocusUntil ?? 0;
        break;
      }
    }

    this._refocusTimer = setTimeout(
      () => {
        this._refocusTimer = null;
        this._scheduleSettle();
      },
      Math.max(0, until - Date.now()) + 1,
    );
  }

  private _scheduleSettle(): void {
    if (this._initialFocusPending) {
      return;
    }

    this._initialFocusPending = true;
    queueMicrotask(() => {
      this._initialFocusPending = false;
      this._settleRepicks();
      this._recalculateFocusPath();
      this._runClaims();
    });
  }

  private _recalculateFocusPath(): void {
    const layer = this.activeLayer;
    const oldPath = layer.focusPath;

    if (this._batchInitialFocus && this._holdsForClaim()) {
      return;
    }

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

      // A reparented element can sit at a different index in the new path
      // without having lost focus.
      if (removedFocus?.focused && !newPath.includes(removedFocus)) {
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

    if (leafChanged && newLeaf) {
      this._rememberLeafRect(layer, newLeaf);

      if (this._rememberingNodes > 0) {
        this._rememberLeafKey(layer, newPath, newLeaf);
      }
    }

    if (this._boundaryHandlers.size > 0) {
      for (let i = oldPath.length - 1; i >= divergenceIndex; i--) {
        if (!newPath.includes(oldPath[i] as T)) {
          this._boundaryHandlers.get(oldPath[i] as T)?.leave?.();
        }
      }

      for (let i = divergenceIndex; i < newPath.length; i++) {
        if (!oldPath.includes(newPath[i] as T)) {
          this._boundaryHandlers.get(newPath[i] as T)?.enter?.();
        }
      }
    }

    layer.focusPath = newPath;

    if (this._claimHoldUntil !== 0 && newPath.length > 0) {
      this._claimHoldUntil = 0;

      if (this._claimHoldTimer !== null) {
        clearTimeout(this._claimHoldTimer);
        this._claimHoldTimer = null;
      }
    }

    this._eventEmitter.emit('focusPathChanged', newPath);
  }

  private _rememberLeafKey(layer: FocusLayer<T>, path: T[], leaf: T): void {
    const key = this._elementKeys.get(leaf);

    for (const element of path) {
      const node = layer.elements.get(element);

      if (node?.rememberAs == null) {
        continue;
      }

      const keys = (node.rememberedLeafKeys ??= new Map());

      if (key === undefined) {
        keys.delete(node.rememberAs);
      } else {
        keys.set(node.rememberAs, key);
      }
    }
  }

  private _rememberLeafRect(layer: FocusLayer<T>, leaf: T): void {
    const node = layer.elements.get(leaf);

    if (node && this._measure(leaf, this._lastRect)) {
      this._lastRectNode = node;
    }
  }

  /**
   * tvOS/web bubble focus through plain wrapper views; the focus path only reaches focus nodes,
   * so deliver to the remaining ancestors (skip at/past `divergenceIndex`, they fired their own).
   */
  private _bubbleFocusEvent(
    type: 'focus' | 'blur',
    target: T,
    path: T[],
    divergenceIndex: number,
  ): void {
    let curr: T | null | undefined = target.parent;

    while (curr) {
      if (path.indexOf(curr, divergenceIndex) === -1) {
        curr.bubbleFocusEvent?.(type, target);
      }

      curr = curr.parent;
    }
  }
}

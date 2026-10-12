import { Keys } from '../input/Keys';
import type { KeyEvent, LightningElement } from '../types';
import { findClosestElement, resolveDirectionalTarget } from '../utils/findClosestElement';
import { Direction } from './Direction';
import type { FocusExits, FocusManager, FocusNode } from './FocusManager';

/** Lazily maps FocusNode children to their elements without allocating an array */
function* childElements(
  children: FocusNode<LightningElement>[],
  exclude?: FocusNode<LightningElement>,
): Iterable<LightningElement> {
  for (let i = 0; i < children.length; i++) {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- bounds-checked loop
    const child = children[i]!;

    if (child === exclude) {
      continue;
    }

    // A focus group with no focusable descendant only wraps non-interactive
    // content (a list header); skip it so nav lands on a real target.
    // A redirect with destinations is a target even when empty, it forwards on arrival.
    const redirectsSomewhere =
      child.focusRedirect && !!(child.destinationKeys || child.destinations);

    if (child.element.isFocusGroup && !child.hasFocusableChildren && !redirectsSomewhere) {
      continue;
    }

    yield child.element;
  }
}

const EXIT_NAMES: Record<number, keyof FocusExits> = {
  [Direction.Up]: 'up',
  [Direction.Right]: 'right',
  [Direction.Down]: 'down',
  [Direction.Left]: 'left',
};

function isInside(element: LightningElement, group: LightningElement): boolean {
  for (
    let current: LightningElement | null | undefined = element;
    current;
    current = current.parent
  ) {
    if (current === group) {
      return true;
    }
  }

  return false;
}

export class FocusKeyManager<T extends LightningElement> {
  private _focusManager: FocusManager<LightningElement>;

  public constructor(focusManager: FocusManager<LightningElement>) {
    this._focusManager = focusManager;
  }

  public handleKeyDown = (element: T, event: KeyEvent): boolean => {
    if (event.stopFocusHandling) {
      return true;
    }

    const key = event.remoteKey;
    let direction: Direction | null = null;

    if (Array.isArray(key)) {
      for (let i = 0; i < key.length && direction == null; i++) {
        direction = this._getKeyDirection(key[i] as Keys);
      }
    } else {
      direction = this._getKeyDirection(key);
    }

    if (direction == null) {
      return true;
    }

    this._focusManager.endInitialClaims();

    return this._tryFocusNext(element, event, direction);
  };

  private _getKeyDirection = (key: Keys): Direction | null => {
    let direction: Direction | null = null;

    switch (key) {
      case Keys.Left:
        direction = Direction.Left;
        break;
      case Keys.Right:
        direction = Direction.Right;
        break;
      case Keys.Up:
        direction = Direction.Up;
        break;
      case Keys.Down:
        direction = Direction.Down;
        break;
    }

    return direction;
  };

  // Returns false if focus works, to stop the propagation of the key event.
  // If there's nothing to navigate to, return true and let the event bubble
  // up to be handled by the next focus group.
  private _tryFocusNext = (element: T, event: KeyEvent, direction: Direction): boolean => {
    const focusNode = this._focusManager.getFocusNode(element);

    if (!focusNode) {
      return true;
    }

    if (!element.focusable || !focusNode.focusedElement) {
      return true;
    }

    const focusedChild = focusNode.focusedElement;
    let leafNode: FocusNode<LightningElement> = focusedChild;

    while (leafNode.focusedElement) {
      leafNode = leafNode.focusedElement;
    }

    // Beam from the deepest focused leaf, as UIKit and Android do, so a
    // full-width row moves from where the user is in it. The row itself is the
    // fallback when nothing lines up with the leaf.
    const closestElement =
      this._closestSibling(leafNode.element, focusNode, direction) ??
      (leafNode === focusedChild
        ? null
        : this._closestSibling(focusedChild.element, focusNode, direction));

    if (closestElement) {
      // A redirect node (e.g. a row's airings guide) is returned for the focus
      // manager to forward to its anchored destination.
      const target = resolveDirectionalTarget(
        leafNode.element,
        closestElement,
        focusNode.parent.element,
        direction,
        this._focusableChildElements,
        this._isRedirect,
        this._getAllowOffscreen,
      );

      this._focusManager.focus(target);

      return false;
    }

    const exitKey = focusNode.exits?.[EXIT_NAMES[direction] as keyof FocusExits];
    const exitTarget = exitKey ? this._focusManager.getElementByKey(exitKey) : null;

    if (exitTarget?.focusable && !isInside(exitTarget, element)) {
      this._focusManager.focus(exitTarget);

      return false;
    }

    const { traps } = focusNode;

    if (
      (direction === Direction.Left && traps.left) ||
      (direction === Direction.Right && traps.right) ||
      (direction === Direction.Up && traps.up) ||
      (direction === Direction.Down && traps.down)
    ) {
      // Don't allow focus handling anymore, but key event
      // should still propagate.
      event.stopFocusHandling = true;
    }

    return true;
  };

  private _closestSibling(
    source: LightningElement,
    focusNode: FocusNode<LightningElement>,
    direction: Direction,
  ): LightningElement | null {
    return findClosestElement(
      source,
      childElements(focusNode.children, focusNode.focusedElement ?? undefined),
      focusNode.parent.element,
      direction,
      focusNode.allowOffscreen,
      this._hasFocusableChildren,
    );
  }

  private _hasFocusableChildren = (element: LightningElement): boolean => {
    const node = this._focusManager.getFocusNode(element);

    return !!node && node.children.length > 0;
  };

  private _focusableChildElements = (element: LightningElement): Iterable<LightningElement> => {
    const node = this._focusManager.getFocusNode(element);

    return node ? childElements(node.children) : [];
  };

  private _getAllowOffscreen = (element: LightningElement): boolean => {
    const node = this._focusManager.getFocusNode(element);

    return !!node?.allowOffscreen;
  };

  private _isRedirect = (element: LightningElement): boolean => {
    const node = this._focusManager.getFocusNode(element);

    if (!node || node.focusEntry === 'spatial') {
      return false;
    }

    return node.focusRedirect || node.focusEntry === 'first' || node.focusEntry === 'last-focused';
  };
}

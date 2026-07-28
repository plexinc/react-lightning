import { Keys } from '../input/Keys';
import type { KeyEvent, LightningElement } from '../types';
import { findClosestElement, resolveDirectionalTarget } from '../utils/findClosestElement';
import { Direction } from './Direction';
import type { FocusManager, FocusNode } from './FocusManager';

/** Lazily maps FocusNode children to their elements without allocating an array */
function* childElements(children: FocusNode<LightningElement>[]): Iterable<LightningElement> {
  for (let i = 0; i < children.length; i++) {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- bounds-checked loop
    const child = children[i]!;

    // A focus group with no focusable descendant only wraps non-interactive
    // content (a list header); skip it so nav lands on a real target.
    if (child.element.isFocusGroup && !child.hasFocusableChildren) {
      continue;
    }

    yield child.element;
  }
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
    const direction = Array.isArray(key)
      ? key.map((k) => this._getKeyDirection(k)).find((dir) => dir != null)
      : this._getKeyDirection(key);

    if (direction == null) {
      return true;
    }

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

    // Pick the next sibling from the immediate focused child, so the current
    // subtree (and its ancestors) are excluded as candidates.
    const closestElement = findClosestElement(
      focusNode.focusedElement.element,
      childElements(focusNode.children),
      focusNode.parent.element,
      direction,
      focusNode.allowOffscreen,
    );

    if (closestElement) {
      // Descend into the chosen sibling from the deepest focused leaf, not the
      // group's immediate child, so a nested layout keeps the real cross-axis
      // position of what the user is on (an EPG airing, not its full-width row)
      // and lands on the overlapping child instead of the group's first child.
      // A redirect node (e.g. a row's airings guide) is returned for the focus
      // manager to forward to its anchored destination.
      let leafNode: FocusNode<LightningElement> = focusNode.focusedElement;

      while (leafNode.focusedElement) {
        leafNode = leafNode.focusedElement;
      }

      const target = resolveDirectionalTarget(
        leafNode.element,
        closestElement,
        focusNode.parent.element,
        direction,
        (child) => this._focusableChildElements(child),
        (child) => this._isRedirect(child),
        (child) => this._getAllowOffscreen(child),
      );

      this._focusManager.focus(target);

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

    return !!node?.focusRedirect;
  };
}

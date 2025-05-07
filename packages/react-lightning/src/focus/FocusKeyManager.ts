import { Keys } from '../input/Keys';
import type { LightningElement } from '../types';
import { findClosestElement } from '../utils/findClosestElement';
import { Direction } from './Direction';
import type { FocusManager } from './FocusManager';

export class FocusKeyManager<T extends LightningElement> {
  private _focusManager: FocusManager<T>;

  public constructor(focusManager: FocusManager<T>) {
    this._focusManager = focusManager;
  }

  public handleKeyDown = (element: T, key: Keys | Keys[]) => {
    const direction = Array.isArray(key)
      ? key.map((k) => this._getKeyDirection(k)).find((dir) => dir != null)
      : this._getKeyDirection(key);

    if (direction == null) {
      return true;
    }

    return this._tryFocusNext(element, direction);
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
  private _tryFocusNext = (element: T, direction: Direction): boolean => {
    const focusNode = this._focusManager.getFocusNode(element);

    if (!focusNode) {
      console.warn(
        'FocusKeyManager: No focus node found for element. Was this element added to the Focus Manager?',
        element,
      );
      return true;
    }

    if (!element.focusable || !focusNode.focusedElement) {
      return true;
    }

    const { traps } = focusNode;

    if (
      (direction === Direction.Left && traps.left) ||
      (direction === Direction.Right && traps.right) ||
      (direction === Direction.Up && traps.up) ||
      (direction === Direction.Down && traps.down)
    ) {
      // Don't bubble up
      return false;
    }

    const closestElement = findClosestElement(
      focusNode.focusedElement.element,
      focusNode.children.map((child) => child.element),
      focusNode.parent.element,
      direction,
    );

    if (closestElement) {
      this._focusManager.focus(closestElement as T);
      return false;
    }

    return true;
  };
}

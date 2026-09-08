import { PARTIAL_STYLE } from '@plextv/react-lightning';
import type {
  FocusManager,
  LightningElement,
  LightningElementStyle,
} from '@plextv/react-lightning';

import { createCSSStyleParts } from './filterCSSStyle';
import { trackFocusWithin } from './focusWithin';
import { resolvePseudoStyle } from './resolvePseudoStyle';
import type { CSSStyleParts, LightningTransition, SupportedPseudoSelector } from './types';
import { warnOnce } from './warnOnce';

function isSameValue(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => isSameValue(item, b[index]));
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = Object.keys(left);

    return (
      keys.length === Object.keys(right).length &&
      keys.every((key) => isSameValue(left[key], right[key]))
    );
  }

  return false;
}

/**
 * Runs the CSS side of an animated style for one element: keeps the transition
 * settings on the node and swaps the pseudo-selector props as focus moves.
 */
export class CSSStyleBinding {
  private readonly _focusManager: FocusManager<LightningElement> | null;
  private _element: LightningElement | null = null;
  private _parts: CSSStyleParts = createCSSStyleParts();
  private _transition: LightningTransition | null = null;
  private _active = new Set<SupportedPseudoSelector>();
  private _applied: Record<string, unknown> = {};
  private _hasPushed = false;
  private _disposers: (() => void)[] = [];

  public constructor(focusManager: FocusManager<LightningElement> | null) {
    this._focusManager = focusManager;
  }

  /** Called after every commit that produced new style objects. */
  public update(parts: CSSStyleParts, transition: LightningTransition | null): void {
    this._parts = parts;
    this._transition = transition;
    this._resubscribe();
    this._apply();
  }

  public setElement(element: LightningElement | null): void {
    if (this._element === element) {
      return;
    }

    this._element = element;
    // A fresh node holds none of our props (and none of them are rendered).
    this._applied = {};
    this._hasPushed = false;
    this._resubscribe();
    this._apply();
  }

  public destroy(): void {
    this._unsubscribe();
    this._element = null;
  }

  private _unsubscribe(): void {
    for (const dispose of this._disposers) {
      dispose();
    }

    this._disposers = [];
  }

  private _resubscribe(): void {
    this._unsubscribe();

    const element = this._element;

    if (!element) {
      return;
    }

    const active = new Set<SupportedPseudoSelector>();

    if (this._parts.pseudoStyles[':focus']) {
      if (element.focused) {
        active.add(':focus');
      }

      this._disposers.push(
        element.on('focusChanged', (_element: LightningElement, focused: boolean) => {
          this._setActive(':focus', focused);
        }),
      );
    }

    if (this._parts.pseudoStyles[':focus-within']) {
      if (this._focusManager) {
        const { within, dispose } = trackFocusWithin(this._focusManager, element, (isWithin) => {
          this._setActive(':focus-within', isWithin);
        });

        if (within) {
          active.add(':focus-within');
        }

        this._disposers.push(dispose);
      } else {
        warnOnce('":focus-within" needs a FocusManagerProvider above the animated component.');
      }
    }

    this._active = active;
  }

  private _setActive(selector: SupportedPseudoSelector, active: boolean): void {
    if (active) {
      this._active.add(selector);
    } else {
      this._active.delete(selector);
    }

    this._apply();
  }

  private _apply(): void {
    const element = this._element;

    if (!element) {
      return;
    }

    const resolved = resolvePseudoStyle(
      this._parts.base,
      this._parts.pseudoStyles,
      this._active,
    ) as Record<string, unknown>;
    const changed: Record<string, unknown> = {};
    let hasChanges = false;

    for (const prop in resolved) {
      if (!isSameValue(resolved[prop], this._applied[prop])) {
        changed[prop] = resolved[prop];
        hasChanges = true;
      }
    }

    this._applied = resolved;

    if (!hasChanges) {
      this._syncTransition(element);

      return;
    }

    // The resting values land before the transition does, so a node attaching
    // in an active state doesn't animate in from the node's defaults.
    const deferTransition = !this._hasPushed;

    this._hasPushed = true;

    if (!deferTransition) {
      this._syncTransition(element);
    }

    this._push(element, changed);

    if (deferTransition) {
      this._syncTransition(element);
    }
  }

  private _syncTransition(element: LightningElement): void {
    if (this._transition) {
      element.setProps({ transition: this._transition });
    }
  }

  private _push(element: LightningElement, style: Record<string, unknown>): void {
    (style as Record<PropertyKey, unknown>)[PARTIAL_STYLE] = true;

    element.setProps({ style: style as LightningElementStyle });
  }
}

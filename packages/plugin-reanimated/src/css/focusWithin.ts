import type { FocusManager, LightningElement } from '@plextv/react-lightning';

type Listener = (within: boolean) => void;

/**
 * `:focus-within` has to answer "does this element contain the focused one",
 * and a wrapper View never appears in the focus path. One tracker per focus
 * manager walks up from the focused leaf once per focus change instead of
 * every subscriber walking its own ancestors.
 */
class FocusWithinTracker {
  private readonly _focusManager: FocusManager<LightningElement>;
  private readonly _listeners = new Map<LightningElement, Listener>();
  private _within = new Set<LightningElement>();
  private _unsubscribe: (() => void) | null = null;

  public constructor(focusManager: FocusManager<LightningElement>) {
    this._focusManager = focusManager;
  }

  /** Returns whether the element already contains focus. */
  public add(element: LightningElement, listener: Listener): boolean {
    this._listeners.set(element, listener);
    this._unsubscribe ??= this._focusManager.on('focusPathChanged', this._onFocusPathChanged);

    const within = this._contains(element, this._focusManager.focusPath);

    if (within) {
      this._within.add(element);
    }

    return within;
  }

  public remove(element: LightningElement): void {
    this._listeners.delete(element);
    this._within.delete(element);

    if (!this._listeners.size) {
      this._unsubscribe?.();
      this._unsubscribe = null;
    }
  }

  private _contains(element: LightningElement, path: LightningElement[]): boolean {
    for (let node: LightningElement | null | undefined = path.at(-1); node; node = node.parent) {
      if (node === element) {
        return true;
      }
    }

    return false;
  }

  private _onFocusPathChanged = (path: LightningElement[]): void => {
    const next = new Set<LightningElement>();

    for (let node: LightningElement | null | undefined = path.at(-1); node; node = node.parent) {
      if (this._listeners.has(node)) {
        next.add(node);
      }
    }

    const previous = this._within;

    this._within = next;

    for (const element of next) {
      if (!previous.has(element)) {
        this._listeners.get(element)?.(true);
      }
    }

    for (const element of previous) {
      if (!next.has(element)) {
        this._listeners.get(element)?.(false);
      }
    }
  };
}

const trackers = new WeakMap<FocusManager<LightningElement>, FocusWithinTracker>();

export function trackFocusWithin(
  focusManager: FocusManager<LightningElement>,
  element: LightningElement,
  listener: Listener,
): { within: boolean; dispose: () => void } {
  let tracker = trackers.get(focusManager);

  if (!tracker) {
    tracker = new FocusWithinTracker(focusManager);
    trackers.set(focusManager, tracker);
  }

  const within = tracker.add(element, listener);

  return { within, dispose: () => tracker?.remove(element) };
}

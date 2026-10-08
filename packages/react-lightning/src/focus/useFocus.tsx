import { type RefObject, useContext, useEffect, useRef, useSyncExternalStore } from 'react';

import type { LightningElement } from '../types';
import { FocusGroupContext } from './FocusGroupContext';
import type { FocusEntry, FocusExits } from './FocusManager';
import type { Traps } from './Traps';
import { useFocusManager } from './useFocusManager';

export type FocusOptions = {
  active?: boolean;
  autoFocus?: boolean;
  focusRedirect?: boolean;
  destinations?: (LightningElement | null)[];
  onChildFocused?: (child: LightningElement) => void;
  /** When true, focus navigation can target non-visible children (e.g. clipped items in a virtualized list). */
  allowOffscreen?: boolean;
  /**
   * When true, this element is reachable only by a deliberate directional move,
   * never by focus restoration (fallback after a sibling unmounts) or the
   * mount-time default. Mirrors tvOS `isTVFocusRestorationExcluded`.
   */
  focusRestorationExcluded?: boolean;
  focusKey?: string;
  destinationKeys?: readonly string[];
  exits?: FocusExits;
  traps?: Traps;
  focusEntry?: FocusEntry;
  rememberAs?: string;
  scope?: boolean;
  scopeActive?: boolean;
  initialFocus?: number;
  onFocusEnter?: () => void;
  onFocusLeave?: () => void;
};

const DEFAULT_OPTIONS: FocusOptions = { active: true, autoFocus: false, focusRedirect: false };

function sameArray(a?: readonly unknown[] | null, b?: readonly unknown[] | null): boolean {
  if (a === b) {
    return true;
  }

  if (!a || !b || a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

function sameExits(a?: FocusExits, b?: FocusExits): boolean {
  return (
    a === b ||
    (a?.up === b?.up && a?.right === b?.right && a?.down === b?.down && a?.left === b?.left)
  );
}

function sameTraps(a?: Traps, b?: Traps): boolean {
  return (
    a === b ||
    (!!a === !!b &&
      a?.up === b?.up &&
      a?.right === b?.right &&
      a?.down === b?.down &&
      a?.left === b?.left)
  );
}

function sameHandlers(a: FocusOptions, b: FocusOptions): boolean {
  return (
    a.onChildFocused === b.onChildFocused &&
    a.onFocusEnter === b.onFocusEnter &&
    a.onFocusLeave === b.onFocusLeave
  );
}

function sameStructure(a: FocusOptions, b: FocusOptions): boolean {
  return (
    a.autoFocus === b.autoFocus &&
    a.focusRedirect === b.focusRedirect &&
    a.allowOffscreen === b.allowOffscreen &&
    a.focusRestorationExcluded === b.focusRestorationExcluded &&
    a.focusKey === b.focusKey &&
    a.focusEntry === b.focusEntry &&
    a.rememberAs === b.rememberAs &&
    a.scope === b.scope &&
    a.scopeActive === b.scopeActive &&
    a.initialFocus === b.initialFocus &&
    sameArray(a.destinations, b.destinations) &&
    sameArray(a.destinationKeys, b.destinationKeys) &&
    sameExits(a.exits, b.exits) &&
    sameTraps(a.traps, b.traps)
  );
}

export function useFocus<T extends LightningElement>(
  options: FocusOptions = DEFAULT_OPTIONS,
): {
  ref: RefObject<T | null>;
  focused: boolean;
} {
  const ref = useRef<T>(null);
  const focusManager = useFocusManager();
  const parentFocusable = useContext(FocusGroupContext);

  const focused = useSyncExternalStore(
    (onStoreChange) => {
      if (ref.current) {
        return ref.current?.on('focusChanged', onStoreChange);
      }

      return () => {};
    },
    () => ref.current?.focused ?? false,
  );

  // We need to keep a copy of the ref around for when this hook is unmounted,
  // so we can properly remove the child element.
  const elementRef = useRef<T>(null);
  const appliedRef = useRef<FocusOptions | null>(null);
  const activeRef = useRef<boolean | undefined | 'unset'>('unset');

  /* oxlint-disable-next-line react-hooks/exhaustive-deps -- Registration only
    re-runs when the manager or parent changes; later option changes are applied
    by the update effect below, so the element isn't removed and re-added. */
  useEffect(() => {
    if (ref.current && parentFocusable) {
      elementRef.current = ref.current;
      appliedRef.current = options;
      focusManager.addElement(elementRef.current, parentFocusable, options);

      // Re-parenting marks an unfocusable element focusable again; an element
      // that is inactive on purpose has to stay out of the search.
      if (options.active === false) {
        elementRef.current.focusable = false;
      }
    }

    return () => {
      if (elementRef.current) {
        focusManager.removeElement(elementRef.current);
      }
    };
  }, [focusManager, parentFocusable]);

  // Runs after every render on purpose: it only compares fields and calls the
  // manager when something changed, which is cheaper than an effect per option.
  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (activeRef.current !== options.active) {
      activeRef.current = options.active;
      element.focusable = options.active !== undefined ? options.active : true;
    }

    const applied = appliedRef.current;

    if (!applied || applied === options) {
      return;
    }

    appliedRef.current = options;

    if (!sameStructure(applied, options)) {
      focusManager.updateElement(element, options);
    } else if (!sameHandlers(applied, options)) {
      focusManager.setHandlers(element, options);
    }
  });

  return { ref, focused };
}

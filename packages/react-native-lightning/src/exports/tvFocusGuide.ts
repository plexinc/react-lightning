import type { FocusEntry } from '@plextv/react-lightning';

export type TVFocusGuideOptions<T> = {
  autoFocus?: boolean | null;
  destinations?: readonly (T | null | undefined)[] | null;
  focusable?: boolean | null;
};

export type TVFocusGuideGroupOptions<T> = {
  destinations: (T | null)[] | undefined;
  focusRedirect: boolean;
  focusEntry: FocusEntry | undefined;
  disable: boolean;
};

function liveDestinations<T>(
  destinations: readonly (T | null | undefined)[] | null | undefined,
): (T | null)[] | undefined {
  if (!destinations?.length) {
    return undefined;
  }

  if (!destinations.some((destination) => destination == null)) {
    return destinations as (T | null)[];
  }

  const live = destinations.filter((destination): destination is T => destination != null);

  return live.length ? live : undefined;
}

export function toFocusGroupOptions<T>(
  options: TVFocusGuideOptions<T>,
): TVFocusGuideGroupOptions<T> {
  const destinations = liveDestinations(options.destinations);

  return {
    destinations,
    focusRedirect: destinations !== undefined,
    focusEntry: options.autoFocus ? 'last-focused' : undefined,
    disable: options.focusable === false,
  };
}

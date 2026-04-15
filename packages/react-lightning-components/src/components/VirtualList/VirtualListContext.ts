import { type Context, createContext } from 'react';

export interface CellBounds {
  /** Cell's width in pixels — always set, always positive when known. */
  width: number;
  /** Cell's height in pixels — always set, always positive when known. */
  height: number;
}

export const CellBoundsContext: Context<CellBounds | null> = createContext<CellBounds | null>(null);

/**
 * State that survives a cell recycle/remount so the next time a row with the
 * same identity becomes visible, it picks up where it left off.
 */
export interface VLPersistedState {
  scrollOffset: number;
  /**
   * Last item index that had focus inside this VL. On remount, the cell at
   * this index gets `shouldFocus: true` so renderItem can opt into focusing
   * the right item.
   */
  focusedIndex?: number;
  /**
   * Snapshot of the VL's per-userKey measurement map at save time. On
   * remount, the new VL seeds its LayoutManager with this so the row's
   * content (inner cells, sections) doesn't have to re-measure from
   * estimate — which would otherwise cascade through every following item
   * via layoutVersion bumps as each cell pushes its first measurement.
   *
   * The cache holds a reference, not a copy. The producing VL is unmounted
   * by the time this gets read, so no aliasing concern.
   */
  measurements?: Map<string, number>;
}

/**
 * Identity key of the enclosing cell (from the parent VL's keyExtractor).
 * A nested VL reads this to know which slot in the parent VL's state cache
 * belongs to it.
 */
export const VLCellKeyContext: Context<string | null> = createContext<string | null>(null);

/**
 * Per-VL state cache. The VL provides this to its descendants so a nested
 * VL inside a cell can persist its scroll position + focused index across
 * recycle remounts (keyed by the nested VL's enclosing cell key).
 */
export const VLStateCacheContext: Context<Map<string, VLPersistedState> | null> = createContext<
  Map<string, VLPersistedState> | null
>(null);

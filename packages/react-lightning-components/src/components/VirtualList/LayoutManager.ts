import type { OverrideItemLayoutFn } from './VirtualListTypes';

export interface ComputedLayout {
  /** Main-axis offset of this item from the start of the item area. */
  offset: number;
  /** Main-axis size of this item. */
  size: number;
  /** Column index in a multi-column grid (0 for single-column). */
  column: number;
  /** Cross-axis offset within the row (0 for single-column). */
  crossOffset: number;
  /** Cross-axis size of this item. */
  crossSize: number;
}

export interface LayoutManagerConfig<T> {
  data: ReadonlyArray<T>;
  estimatedItemSize: number;
  numColumns: number;
  overrideItemLayout?: OverrideItemLayoutFn<T>;
  extraData?: unknown;
  separatorSize?: number;
  /**
   * Cross-axis size of a single column, computed by VirtualList from its
   * viewport. The LayoutManager treats this as ground truth — no aggregation
   * from cell-reported sizes. When 0/unset, layouts still resolve their
   * main-axis offsets correctly so visibility math works during the first
   * render.
   */
  cellCrossSize: number;
  /**
   * Stable identity function for items, mirroring `VirtualList.keyExtractor`.
   * Used to key measurements so they survive recycling and data shifts.
   * When not provided, the index is used as the key — measurements still
   * work but don't survive inserts/removes that shift indices.
   */
  keyExtractor?: (item: T, index: number) => string;
}

/**
 * Computes per-item offsets in O(n). Sizes come from (in priority order)
 * a measurement reported via `reportItemSize`, then `overrideItemLayout`,
 * then `estimatedItemSize`. Cross-axis size is unilateral: every item's
 * `crossSize` equals the configured `cellCrossSize` (× span for grids).
 * Cross-axis is never measured or aggregated — that's the load-bearing
 * rule that keeps the layout free of feedback loops.
 *
 * Measurements are stored by `userKey` (from `keyExtractor`) so they
 * survive recycling and data inserts/removes that shift indices.
 */
export class LayoutManager<T> {
  private static _overrideScratch: { size?: number; span?: number } = {};
  private _layouts: ComputedLayout[] = [];
  private _layoutCount = 0;
  private _totalSize = 0;
  private _dirty = true;
  private _data: ReadonlyArray<T>;
  private _estimatedItemSize: number;
  private _numColumns: number;
  private _overrideItemLayout?: OverrideItemLayoutFn<T>;
  private _extraData?: unknown;
  private _separatorSize: number;
  private _cellCrossSize: number;
  private _keyExtractor?: (item: T, index: number) => string;
  private _measuredSizes: Map<string, number> = new Map();
  /**
   * While `_batching` is on (VL flips it during a scroll/focus-snap
   * animation), reports accumulate per-`userKey` here instead of running
   * through dampening — the animation is the consumer's clear signal that
   * intermediate yoga measurements aren't worth committing.
   * `setBatching(false)` drains this directly into `_measuredSizes` at
   * animation end.
   */
  private _batching = false;
  private _batchedSizes: Map<string, number> = new Map();
  /**
   * Per-`userKey` stability window. When a cell's reported size differs
   * from the currently-stored one, the new value sits here until either
   * (a) the same value is re-reported after `_STABILITY_MS` elapses, or
   * (b) the backstop timer fires `_STABILITY_MS` after `firstSeenAt`. A
   * different incoming value cancels the timer and replaces the entry.
   *
   * This dampens the multi-frame cascade where a user's section component
   * re-measures during focus/scroll animations or async content settling
   * — without dampening, every intermediate measurement reflows the
   * layout for every following item.
   */
  private _pendingSizes: Map<string, { size: number; firstSeenAt: number }> = new Map();
  /**
   * Backstop timers per `userKey`. Required because a cell may push
   * exactly once for a given size and then go quiet (props stable, no
   * further re-renders) — without the timer, the pending value would
   * sit forever and the layout would paint at the old size.
   */
  private _pendingTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private _onChange?: () => void;
  private static readonly _STABILITY_MS = 120;
  /**
   * The very first non-zero size reported via `reportItemSize` for this
   * list. Used as the implicit fallback for unmeasured items in place of
   * the caller-provided `estimatedItemSize` once at least one cell has
   * been seen — empirically that's a much better predictor than a generic
   * estimate, and it cuts the visible reflow when subsequent cells turn
   * out to be roughly the same size.
   *
   * Locked on first measurement; never updates. If we tracked the most
   * recent measurement instead, every measured cell would shift the
   * implicit estimate and cascade-rerender every later unmeasured item —
   * which is the opposite of "less jank". The first measurement is
   * usually representative and the remaining error gets corrected only
   * when each individual cell measures.
   */
  private _firstMeasuredSize = 0;

  constructor(config: LayoutManagerConfig<T>) {
    this._data = config.data;
    this._estimatedItemSize = config.estimatedItemSize;
    this._numColumns = Math.max(1, config.numColumns);
    this._overrideItemLayout = config.overrideItemLayout;
    this._extraData = config.extraData;
    this._separatorSize = config.separatorSize ?? 0;
    this._cellCrossSize = config.cellCrossSize;
    this._keyExtractor = config.keyExtractor;
  }

  get totalSize(): number {
    if (this._dirty) {
      this._recompute();
    }

    return this._totalSize;
  }

  /**
   * Register a "layout dirtied" callback. Fires when a pending
   * measurement matures via the stability backstop timer — there's no
   * incoming report at that moment to bump layoutVersion synchronously,
   * so LM has to wake the caller itself.
   */
  setOnChange(cb: () => void): void {
    this._onChange = cb;
  }

  /**
   * Returns a copy of the current per-`userKey` measurement map. Used
   * by VL to snapshot measurements into the parent state cache so a
   * recycled cell's inner VL can restore them on remount instead of
   * having to re-measure from estimate.
   */
  getMeasurements(): Map<string, number> {
    return new Map(this._measuredSizes);
  }

  /**
   * Replaces the current measurement map with the given snapshot. Marks
   * layout dirty. Called from VL when restoring inner VL state from the
   * parent state cache — no `_onChange` notification because the caller
   * is responsible for the surrounding render flow.
   *
   * Also clears any in-flight dampening / batching state — pending
   * entries from the previous content are no longer relevant under
   * the restored measurement set.
   */
  setMeasurements(measurements: Map<string, number>): void {
    this._measuredSizes = new Map(measurements);
    this._batchedSizes.clear();
    this._pendingSizes.clear();

    for (const timer of this._pendingTimers.values()) {
      clearTimeout(timer);
    }

    this._pendingTimers.clear();
    this._dirty = true;
  }

  /**
   * Toggle batching mode. While active, reports accumulate per `userKey`
   * (latest wins) and the dampening path is skipped — animations are the
   * caller's clear signal that intermediate measurements aren't worth
   * committing. Returns `true` if disabling caused at least one stored
   * size to change.
   */
  setBatching(active: boolean): boolean {
    if (this._batching === active) {
      return false;
    }

    this._batching = active;

    if (active) {
      // Switching INTO batching: cancel any in-flight dampening timers.
      // The animation will overwrite all relevant values via the batch,
      // so old pending entries are irrelevant.
      for (const timer of this._pendingTimers.values()) {
        clearTimeout(timer);
      }

      this._pendingTimers.clear();
      this._pendingSizes.clear();

      return false;
    }

    let changed = false;

    for (const [userKey, size] of this._batchedSizes) {
      const existing = this._measuredSizes.get(userKey);

      if (existing != null && Math.abs(existing - size) < 1) {
        continue;
      }

      this._measuredSizes.set(userKey, size);

      if (this._firstMeasuredSize === 0 && size > 0) {
        this._firstMeasuredSize = size;
      }

      changed = true;
    }

    this._batchedSizes.clear();

    if (changed) {
      this._dirty = true;
    }

    return changed;
  }

  updateConfig(config: Partial<LayoutManagerConfig<T>>): boolean {
    let changed = false;

    if (config.data !== undefined && config.data !== this._data) {
      this._data = config.data;
      changed = true;
    }

    if (
      config.estimatedItemSize !== undefined &&
      config.estimatedItemSize !== this._estimatedItemSize
    ) {
      this._estimatedItemSize = config.estimatedItemSize;
      changed = true;
    }

    if (config.numColumns !== undefined) {
      const nc = Math.max(1, config.numColumns);

      if (nc !== this._numColumns) {
        this._numColumns = nc;
        changed = true;
      }
    }

    if (
      config.overrideItemLayout !== undefined &&
      config.overrideItemLayout !== this._overrideItemLayout
    ) {
      this._overrideItemLayout = config.overrideItemLayout;
      changed = true;
    }

    if (config.extraData !== undefined && config.extraData !== this._extraData) {
      this._extraData = config.extraData;
      changed = true;
    }

    if (config.separatorSize !== undefined && config.separatorSize !== this._separatorSize) {
      this._separatorSize = config.separatorSize;
      changed = true;
    }

    if (config.cellCrossSize !== undefined && config.cellCrossSize !== this._cellCrossSize) {
      this._cellCrossSize = config.cellCrossSize;
      changed = true;
    }

    if (config.keyExtractor !== undefined && config.keyExtractor !== this._keyExtractor) {
      this._keyExtractor = config.keyExtractor;
      changed = true;
    }

    if (changed) {
      this._dirty = true;
    }

    return changed;
  }

  /**
   * Records the rendered main-axis size for an item, keyed by its stable
   * `userKey`. Subsequent layouts use this size instead of
   * `overrideItemLayout` / `estimatedItemSize` for that key.
   *
   * Returns `true` when the stored size changed synchronously (caller
   * should bump layoutVersion). Returns `false` when the report was
   * batched, dampened, or rejected.
   *
   * Rejects:
   * - `size <= 0` — transient zero during recycle. Use `reportItemEmpty`
   *   for genuinely-empty rows.
   * - non-finite values.
   */
  reportItemSize(userKey: string, size: number): boolean {
    if (!Number.isFinite(size) || size <= 0) {
      return false;
    }

    if (this._batching) {
      this._batchedSizes.set(userKey, size);

      return false;
    }

    const existing = this._measuredSizes.get(userKey);

    if (existing != null && Math.abs(existing - size) < 1) {
      this._clearPending(userKey);
      return false;
    }

    // First measurement — apply immediately. There's no existing value
    // to thrash against, and waiting would just delay layout settling.
    if (existing == null) {
      this._measuredSizes.set(userKey, size);

      if (this._firstMeasuredSize === 0) {
        this._firstMeasuredSize = size;
      }

      this._clearPending(userKey);
      this._dirty = true;

      return true;
    }

    // Differs from existing — require stability before accepting it.
    const now = Date.now();
    const pending = this._pendingSizes.get(userKey);

    if (pending != null && Math.abs(pending.size - size) < 1) {
      // Same as already-pending. Don't reset the timer. If the window
      // has already elapsed, commit synchronously.
      if (now - pending.firstSeenAt >= LayoutManager._STABILITY_MS) {
        this._measuredSizes.set(userKey, size);
        this._clearPending(userKey);
        this._dirty = true;

        return true;
      }

      return false;
    }

    // New candidate. Replace prior pending (cancels its timer) and
    // schedule a backstop that commits after the stability window even
    // if no further reports arrive.
    this._clearPending(userKey);
    this._pendingSizes.set(userKey, { size, firstSeenAt: now });

    const timer = setTimeout(() => {
      const stillPending = this._pendingSizes.get(userKey);

      if (stillPending == null || Math.abs(stillPending.size - size) >= 1) {
        return;
      }

      this._measuredSizes.set(userKey, size);
      this._pendingSizes.delete(userKey);
      this._pendingTimers.delete(userKey);
      this._dirty = true;
      this._onChange?.();
    }, LayoutManager._STABILITY_MS);

    this._pendingTimers.set(userKey, timer);

    return false;
  }

  private _clearPending(userKey: string): void {
    const timer = this._pendingTimers.get(userKey);

    if (timer != null) {
      clearTimeout(timer);
      this._pendingTimers.delete(userKey);
    }

    this._pendingSizes.delete(userKey);
  }

  /**
   * Drops every per-key measurement and resets the first-measured size.
   * Not called automatically — VirtualList preserves measurements across
   * data identity changes so recycled items use their cached size on
   * first paint. Callers can invoke this imperatively when they truly
   * want to invalidate (e.g. orientation change, theme swap that
   * materially affects content sizing).
   */
  clearMeasurements(): void {
    if (this._measuredSizes.size === 0 && this._firstMeasuredSize === 0) {
      return;
    }

    this._measuredSizes.clear();
    this._batchedSizes.clear();
    this._pendingSizes.clear();

    for (const timer of this._pendingTimers.values()) {
      clearTimeout(timer);
    }

    this._pendingTimers.clear();
    this._firstMeasuredSize = 0;
    this._dirty = true;
  }

  /**
   * Records the item identified by `userKey` as logically empty. The row
   * collapses to zero main-axis size and other items close ranks around
   * it.
   *
   * Distinct from `reportItemSize(_, 0)` (which we reject as a transient
   * FlexRoot zero during recycle): this is the *intentional* empty path,
   * called from `VirtualListCell` when `renderItem` returns null.
   */
  reportItemEmpty(userKey: string): boolean {
    if (this._batching) {
      this._batchedSizes.set(userKey, 0);

      return false;
    }

    const existing = this._measuredSizes.get(userKey);

    if (existing === 0) {
      return false;
    }

    this._measuredSizes.set(userKey, 0);
    this._clearPending(userKey);
    this._dirty = true;

    return true;
  }

  /**
   * Returns the stored measurement for a userKey, or undefined if none.
   * Mostly here so consumers can ask "have I measured this?" without
   * exposing the internal Map.
   */
  getMeasuredSize(userKey: string): number | undefined {
    return this._measuredSizes.get(userKey);
  }

  getLayout(index: number): ComputedLayout | undefined {
    if (this._dirty) {
      this._recompute();
    }

    if (index < 0 || index >= this._layoutCount) {
      return undefined;
    }

    return this._layouts[index];
  }

  /**
   * Returns the layout index whose [offset, offset+size) range contains the
   * given offset (in item-space). Used to map a focused descendant's
   * position back to which item it lives in.
   */
  findIndexAtOffset(offset: number): number {
    if (this._dirty) {
      this._recompute();
    }

    if (this._layoutCount === 0) {
      return -1;
    }

    return this._binarySearchStart(offset);
  }

  getVisibleRange(
    scrollOffset: number,
    viewportSize: number,
    drawDistance: number,
  ): { startIndex: number; endIndex: number } {
    if (this._dirty) {
      this._recompute();
    }

    const count = this._layoutCount;

    if (count === 0) {
      return { startIndex: 0, endIndex: -1 };
    }

    const rangeStart = scrollOffset - drawDistance;
    const rangeEnd = scrollOffset + viewportSize + drawDistance;
    const startIndex = this._binarySearchStart(rangeStart);
    let endIndex = startIndex;

    for (let i = startIndex; i < count; i++) {
      const layout = this._layouts[i];

      if (!layout || layout.offset >= rangeEnd) {
        break;
      }

      endIndex = i;
    }

    return {
      startIndex: Math.max(0, startIndex),
      endIndex: Math.min(count - 1, endIndex),
    };
  }

  private _ensureCapacity(count: number): void {
    for (let i = this._layouts.length; i < count; i++) {
      this._layouts.push({
        offset: 0,
        size: 0,
        column: 0,
        crossOffset: 0,
        crossSize: 0,
      });
    }
  }

  private _binarySearchStart(targetOffset: number): number {
    let low = 0;
    let high = this._layoutCount - 1;
    let result = 0;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const layout = this._layouts[mid];

      if (!layout) {
        break;
      }

      if (layout.offset + layout.size <= targetOffset) {
        low = mid + 1;
      } else {
        result = mid;
        high = mid - 1;
      }
    }

    return result;
  }

  private _recompute(): void {
    this._dirty = false;

    const count = this._data.length;

    if (count === 0) {
      this._layoutCount = 0;
      this._totalSize = 0;

      return;
    }

    this._ensureCapacity(count);

    if (this._numColumns <= 1) {
      this._recomputeSingleColumn(count);
    } else {
      this._recomputeMultiColumn(count);
    }
  }

  private _resolveSize(index: number, isEmpty: boolean, override: { size?: number }): number {
    if (isEmpty) {
      return 0;
    }

    const item = this._data[index];

    if (item != null && this._keyExtractor) {
      const userKey = this._keyExtractor(item, index);
      const measured = this._measuredSizes.get(userKey);

      if (measured != null) {
        return measured;
      }
    }

    if (override.size != null) {
      return override.size;
    }

    // Prefer the first-measured size over the caller's estimate once any
    // cell has reported. Per-key measurements above still win for cells
    // that have actually been seen — this is the fallback for unmeasured
    // ones only.
    return this._firstMeasuredSize > 0 ? this._firstMeasuredSize : this._estimatedItemSize;
  }

  private _recomputeSingleColumn(count: number): void {
    let offset = 0;

    for (let i = 0; i < count; i++) {
      const layout = this._layouts[i];

      if (!layout) {
        break;
      }

      const item = this._data[i];
      // Null/undefined data is rendered as nothing (VirtualList returns
      // null for the cell), so it must take zero main-axis space.
      const isEmpty = item === undefined || item === null;
      const override = this._getOverride(i);
      const size = this._resolveSize(i, isEmpty, override);

      layout.offset = offset;
      layout.size = size;
      layout.column = 0;
      layout.crossOffset = 0;
      layout.crossSize = this._cellCrossSize;

      offset += size;

      if (size > 0 && i < count - 1) {
        offset += this._separatorSize;
      }
    }

    this._layoutCount = count;
    this._totalSize = offset;
  }

  private _recomputeMultiColumn(count: number): void {
    const cellCross = this._cellCrossSize;
    let offset = 0;
    let i = 0;

    while (i < count) {
      let rowHeight = 0;
      let columnsUsed = 0;

      while (i < count && columnsUsed < this._numColumns) {
        const layout = this._layouts[i];

        if (!layout) {
          break;
        }

        const item = this._data[i];
        const isEmpty = item === undefined || item === null;
        const override = this._getOverride(i);
        const span = Math.min(override.span ?? 1, this._numColumns - columnsUsed);
        const size = this._resolveSize(i, isEmpty, override);

        layout.offset = offset;
        layout.size = size;
        layout.column = columnsUsed;
        layout.crossOffset = columnsUsed * cellCross;
        layout.crossSize = span * cellCross;

        rowHeight = Math.max(rowHeight, size);
        columnsUsed += span;

        i++;
      }

      offset += rowHeight;
    }

    this._layoutCount = count;
    this._totalSize = offset;
  }

  private _getOverride(index: number): { size?: number; span?: number } {
    LayoutManager._overrideScratch.size = undefined;
    LayoutManager._overrideScratch.span = undefined;

    const item = this._data[index];

    if (!this._overrideItemLayout || item === undefined) {
      return LayoutManager._overrideScratch;
    }

    this._overrideItemLayout(
      LayoutManager._overrideScratch,
      item,
      index,
      this._numColumns,
      this._extraData,
    );

    return LayoutManager._overrideScratch;
  }
}

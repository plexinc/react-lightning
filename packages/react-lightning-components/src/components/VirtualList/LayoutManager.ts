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
  /** Ground truth from VL viewport; never aggregated from cell reports. */
  cellCrossSize: number;
  /** When omitted, index is used — measurements then don't survive insert/remove that shifts indices. */
  keyExtractor?: (item: T, index: number) => string;
}

/**
 * Computes per-item offsets in O(n). Main-axis size is the per-userKey
 * measurement, then `overrideItemLayout`, then `estimatedItemSize`. Cross
 * is always `cellCrossSize` (× span); never measured or aggregated —
 * that's the rule that keeps the layout loop-free.
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
  /** While true, reports accumulate per-userKey and skip dampening. Drained on `setBatching(false)`. */
  private _batching = false;
  private _batchedSizes: Map<string, number> = new Map();
  /**
   * Per-userKey stability window. A different incoming value sits pending
   * until either matched after `_STABILITY_MS` or the backstop timer
   * fires. Filters multi-frame measurement cascades during scroll/focus
   * animations and async content settling.
   */
  private _pendingSizes: Map<string, { size: number; firstSeenAt: number }> = new Map();
  /** Backstop timers — required because a cell can push once and go quiet (props stable). */
  private _pendingTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private _onChange?: () => void;
  private static readonly _STABILITY_MS = 120;
  /**
   * Implicit fallback for unmeasured items once any cell has measured —
   * usually a much better predictor than the caller's estimate. Locked on
   * first measurement so subsequent cells don't cascade-shift the fallback.
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

  /** Fires when the stability backstop timer commits a pending measurement (no incoming report to bump layoutVersion synchronously). */
  setOnChange(cb: () => void): void {
    this._onChange = cb;
  }

  /** Copy so the cache snapshot doesn't alias live state. */
  getMeasurements(): Map<string, number> {
    return new Map(this._measuredSizes);
  }

  /**
   * Replace measurements wholesale and clear in-flight dampening/batching
   * (entries from prior content are stale under the new set). No
   * `_onChange` — caller owns the surrounding render flow.
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

  /** Returns `true` if disabling drained at least one batched size into measurements. */
  setBatching(active: boolean): boolean {
    if (this._batching === active) {
      return false;
    }

    this._batching = active;

    if (active) {
      // Cancel pending dampening — the upcoming batch will overwrite anyway.
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
   * Records the rendered main-axis size keyed by `userKey`. Returns `true`
   * when the size committed synchronously (caller should bump
   * layoutVersion). Rejects size ≤ 0 / non-finite — use `reportItemEmpty`
   * for genuinely-empty rows.
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

    // First measurement — apply immediately, nothing to thrash against.
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
      // Same as pending — don't reset the timer; commit if window elapsed.
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

  /** Imperative invalidation — VL itself preserves measurements across data identity changes. */
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
   * Collapses the row to zero main-axis size. Distinct from
   * `reportItemSize(_, 0)` (rejected as transient): this is the
   * intentional empty path, fired when `renderItem` returns null.
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

    if (item != null) {
      // Match VirtualListCell: it reports with String(index) when no
      // keyExtractor is configured, so per-item lookup must use the same
      // key. Without this, measurements would be stored but never found.
      const userKey = this._keyExtractor ? this._keyExtractor(item, index) : String(index);
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

import { AverageWindow } from './AverageWindow';
import type { OverrideItemLayoutFn } from './VirtualListTypes';

export interface ComputedLayout {
  offset: number;
  size: number;
  column: number;
  crossOffset: number;
  crossSize: number;
}

export interface LayoutManagerConfig<T> {
  data: ReadonlyArray<T>;
  estimatedItemSize: number;
  numColumns: number;
  overrideItemLayout?: OverrideItemLayoutFn<T>;
  extraData?: unknown;
  separatorSize?: number;
}

export class LayoutManager<T> {
  // Reusable object passed to overrideItemLayout to avoid per-item allocations in hot loops.
  private static _overrideScratch: { size?: number; span?: number } = {};
  private _layouts: ComputedLayout[] = [];
  private _layoutCount = 0;
  private _measuredSizes = new Map<number, number>();
  private _measuredCrossSizes = new Map<number, number>();
  private _averageWindow = new AverageWindow(20);
  private _totalSize = 0;
  private _maxCrossSize = 0;
  private _dirty = true;
  private _pending: Array<{ index: number; size: number; crossSize: number }> = [];
  private _data: ReadonlyArray<T>;
  private _estimatedItemSize: number;
  private _numColumns: number;
  private _overrideItemLayout?: OverrideItemLayoutFn<T>;
  private _extraData?: unknown;
  private _separatorSize = 0;

  constructor(config: LayoutManagerConfig<T>) {
    this._data = config.data;
    this._estimatedItemSize = config.estimatedItemSize;
    this._numColumns = Math.max(1, config.numColumns);
    this._overrideItemLayout = config.overrideItemLayout;
    this._extraData = config.extraData;
    this._separatorSize = config.separatorSize ?? 0;
  }

  get totalSize(): number {
    if (this._dirty) {
      this._recompute();
    }

    return this._totalSize;
  }

  get maxCrossSize(): number {
    return this._maxCrossSize;
  }

  get averageItemSize(): number {
    return this._averageWindow.currentValue || this._estimatedItemSize;
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

    if (changed) {
      this._dirty = true;
    }

    return changed;
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

  reportItemSize(index: number, size: number, crossSize?: number): boolean {
    const layout = this._layouts[index];

    if (!layout || index < 0 || index >= this._layoutCount) {
      return false;
    }

    let changed = false;

    if (Math.abs(layout.size - size) >= 1) {
      this._averageWindow.addValue(size);
      this._measuredSizes.set(index, size);
      layout.size = size;
      changed = true;
    }

    if (crossSize != null && Math.abs(layout.crossSize - crossSize) >= 1) {
      layout.crossSize = crossSize;
      this._measuredCrossSizes.set(index, crossSize);

      if (crossSize > this._maxCrossSize) {
        this._maxCrossSize = crossSize;
      }

      changed = true;
    }

    if (changed) {
      this._dirty = true;
    }

    return changed;
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

  clear(): void {
    this._layoutCount = 0;
    this._measuredSizes.clear();
    this._measuredCrossSizes.clear();
    this._averageWindow.clear();
    this._dirty = true;
    this._totalSize = 0;
    this._maxCrossSize = 0;
    this._pending = [];
  }

  get hasPendingMeasurements(): boolean {
    return this._pending.length > 0;
  }

  deferMeasurement(index: number, size: number, crossSize: number): void {
    this._pending.push({ index, size, crossSize });
  }

  /**
   * Apply all deferred measurements and return how much the anchor
   * item shifted so the caller can adjust the scroll position.
   */
  flushDeferred(anchorIndex?: number): { changed: boolean; anchorDelta: number } {
    const pending = this._pending;
    if (pending.length === 0) {
      return { changed: false, anchorDelta: 0 };
    }

    this._pending = [];
    const anchorBefore =
      anchorIndex != null ? (this.getLayout(anchorIndex)?.offset ?? 0) : 0;

    let changed = false;
    for (const { index, size, crossSize } of pending) {
      if (this.reportItemSize(index, size, crossSize)) {
        changed = true;
      }
    }

    if (!changed || anchorIndex == null) {
      return { changed, anchorDelta: 0 };
    }

    const anchorAfter = this.getLayout(anchorIndex)?.offset ?? 0;
    return { changed, anchorDelta: anchorAfter - anchorBefore };
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

    const estimatedSize = this._averageWindow.currentValue || this._estimatedItemSize;

    if (this._numColumns <= 1) {
      this._recomputeSingleColumn(count, estimatedSize);
    } else {
      this._recomputeMultiColumn(count, estimatedSize);
    }
  }

  private _recomputeSingleColumn(count: number, estimatedSize: number): void {
    let offset = 0;

    for (let i = 0; i < count; i++) {
      const override = this._getOverride(i);
      const size = this._measuredSizes.get(i) ?? override.size ?? estimatedSize;
      const crossSize = this._measuredCrossSizes.get(i) ?? this._estimatedItemSize;
      const layout = this._layouts[i];

      if (!layout) {
        break;
      }

      layout.offset = offset;
      layout.size = size;
      layout.column = 0;
      layout.crossOffset = 0;
      layout.crossSize = crossSize;
      offset += size;

      if (i < count - 1) {
        offset += this._separatorSize;
      }
    }

    this._layoutCount = count;
    this._totalSize = offset;
  }

  private _recomputeMultiColumn(count: number, estimatedSize: number): void {
    const columnWidth = this._estimatedItemSize;
    let offset = 0;
    let i = 0;

    while (i < count) {
      let rowHeight = 0;
      let columnsUsed = 0;

      while (i < count && columnsUsed < this._numColumns) {
        const override = this._getOverride(i);
        const span = Math.min(override.span ?? 1, this._numColumns - columnsUsed);
        const size = this._measuredSizes.get(i) ?? override.size ?? estimatedSize;
        const crossSize = this._measuredCrossSizes.get(i) ?? span * columnWidth;
        const layout = this._layouts[i];

        if (!layout) {
          break;
        }

        layout.offset = offset;
        layout.size = size;
        layout.column = columnsUsed;
        layout.crossOffset = columnsUsed * columnWidth;
        layout.crossSize = crossSize;
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

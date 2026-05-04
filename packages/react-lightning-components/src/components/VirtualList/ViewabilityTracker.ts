import type { ComputedLayout } from './LayoutManager';
import type { ViewabilityConfig, ViewToken } from './VirtualListTypes';

export interface ViewabilityTrackerConfig<T> {
  viewabilityConfig?: ViewabilityConfig;
  onViewableItemsChanged?: (info: {
    viewableItems: ViewToken<T>[];
    changed: ViewToken<T>[];
  }) => void;
  getLayout: (index: number) => ComputedLayout | undefined;
  getData: (index: number) => T | undefined;
  getKey: (index: number) => string;
}

export class ViewabilityTracker<T> {
  private _config: ViewabilityTrackerConfig<T>;
  private _viewableIndices = new Set<number>();
  private _latestViewable = new Set<number>();
  private _pendingTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private _hasInteracted = false;

  constructor(config: ViewabilityTrackerConfig<T>) {
    this._config = config;
  }

  updateConfig(config: Partial<ViewabilityTrackerConfig<T>>): void {
    Object.assign(this._config, config);
  }

  recordInteraction(): void {
    this._hasInteracted = true;
  }

  update(
    visibleIndices: number[],
    scrollOffset: number,
    viewportSize: number,
    _horizontal: boolean,
  ): void {
    const { viewabilityConfig, onViewableItemsChanged } = this._config;

    if (!onViewableItemsChanged) {
      return;
    }

    if (viewabilityConfig?.waitForInteraction && !this._hasInteracted) {
      return;
    }

    const minimumViewTime = viewabilityConfig?.minimumViewTime ?? 0;
    const newViewable = new Set<number>();

    for (const index of visibleIndices) {
      if (this._isItemViewable(index, scrollOffset, viewportSize)) {
        newViewable.add(index);
      }
    }

    // Cancel pending timers for items that left the visible set entirely
    for (const [index, timer] of this._pendingTimers) {
      if (!newViewable.has(index)) {
        clearTimeout(timer);
        this._pendingTimers.delete(index);
      }
    }

    const nowViewable: number[] = [];
    const noLongerViewable: number[] = [];

    for (const index of newViewable) {
      if (!this._viewableIndices.has(index)) {
        nowViewable.push(index);
      }
    }

    for (const index of this._viewableIndices) {
      if (!newViewable.has(index)) {
        noLongerViewable.push(index);
      }
    }

    if (nowViewable.length === 0 && noLongerViewable.length === 0) {
      return;
    }

    if (minimumViewTime > 0) {
      this._handleWithDelay(nowViewable, noLongerViewable, newViewable, minimumViewTime);
    } else {
      this._commitChange(newViewable);
    }
  }

  dispose(): void {
    for (const timer of this._pendingTimers.values()) {
      clearTimeout(timer);
    }

    this._pendingTimers.clear();
    this._viewableIndices.clear();
  }

  private _handleWithDelay(
    nowViewable: number[],
    noLongerViewable: number[],
    newViewable: Set<number>,
    delay: number,
  ): void {
    // Store the latest viewable set so timers always read
    // up-to-date state instead of a stale closure capture.
    this._latestViewable = newViewable;

    for (const index of nowViewable) {
      if (!this._pendingTimers.has(index)) {
        this._pendingTimers.set(
          index,
          setTimeout(() => {
            this._pendingTimers.delete(index);
            // Only graduate this specific item — do not drag along
            // items whose timers have not yet fired.
            if (this._latestViewable.has(index)) {
              const graduated = new Set(this._viewableIndices);

              for (const idx of graduated) {
                if (!this._latestViewable.has(idx)) {
                  graduated.delete(idx);
                }
              }

              graduated.add(index);
              this._commitChange(graduated);
            }
          }, delay),
        );
      }
    }

    for (const index of noLongerViewable) {
      const timer = this._pendingTimers.get(index);

      if (timer) {
        clearTimeout(timer);
        this._pendingTimers.delete(index);
      }
    }

    // Immediately report committed items that are no longer viewable
    let hasCommittedLeaving = false;

    for (const index of noLongerViewable) {
      if (this._viewableIndices.has(index)) {
        hasCommittedLeaving = true;
        break;
      }
    }

    if (hasCommittedLeaving) {
      const updated = new Set(this._viewableIndices);

      for (const index of noLongerViewable) {
        updated.delete(index);
      }

      this._commitChange(updated);
    }
  }

  private _commitChange(newViewable: Set<number>): void {
    const changed: ViewToken<T>[] = [];
    const viewableItems: ViewToken<T>[] = [];

    for (const index of newViewable) {
      const token = this._createToken(index, true);

      if (token) {
        viewableItems.push(token);

        if (!this._viewableIndices.has(index)) {
          changed.push(token);
        }
      }
    }

    for (const index of this._viewableIndices) {
      if (!newViewable.has(index)) {
        const token = this._createToken(index, false);

        if (token) {
          changed.push(token);
        }
      }
    }

    this._viewableIndices = newViewable;

    if (changed.length > 0) {
      this._config.onViewableItemsChanged?.({ viewableItems, changed });
    }
  }

  private _isItemViewable(index: number, scrollOffset: number, viewportSize: number): boolean {
    const layout = this._config.getLayout(index);

    if (!layout || layout.size === 0) {
      return false;
    }

    const { viewabilityConfig } = this._config;
    const viewStart = scrollOffset;
    const viewEnd = scrollOffset + viewportSize;
    const itemStart = layout.offset;
    const itemEnd = layout.offset + layout.size;

    if (itemEnd <= viewStart || itemStart >= viewEnd) {
      return false;
    }

    if (itemStart >= viewStart && itemEnd <= viewEnd) {
      return true;
    }

    const pixelsVisible = Math.min(itemEnd, viewEnd) - Math.max(itemStart, viewStart);

    if (viewabilityConfig?.viewAreaCoveragePercentThreshold != null) {
      return (
        (pixelsVisible / viewportSize) * 100 >= viewabilityConfig.viewAreaCoveragePercentThreshold
      );
    }

    const threshold = viewabilityConfig?.itemVisiblePercentThreshold ?? 0;

    return (pixelsVisible / layout.size) * 100 >= threshold;
  }

  private _createToken(index: number, isViewable: boolean): ViewToken<T> | null {
    const item = this._config.getData(index);

    if (item === undefined) {
      return null;
    }

    return {
      item,
      key: this._config.getKey(index),
      index,
      isViewable,
      timestamp: Date.now(),
    };
  }
}

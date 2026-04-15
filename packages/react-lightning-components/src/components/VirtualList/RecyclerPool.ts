export class RecyclerPool {
  /** Debug-only label used in pool logging to disambiguate instances. */
  private _label: string;
  /** dataIndex -> slotKey */
  private _active = new Map<number, string>();
  /** itemType -> available slotKeys */
  private _available = new Map<string | number, string[]>();
  /** slotKey -> itemType */
  private _slotTypes = new Map<string, string | number>();
  /**
   * Last-known slot assignment per data index. When an index leaves
   * visibility and later comes back, we try to give it the same slot it
   * had before — that keeps the cell's React identity stable across the
   * round-trip, so descendant state (like nested VL measurements,
   * focusables, transient component state) survives. Without this, every
   * scroll-out-and-back churns the entire subtree.
   *
   * For this preservation to actually work, callers must keep pooled
   * slots mounted in the React tree (typically positioned offscreen) —
   * see `getPooledSlots`. If pooled cells are unmounted, this map only
   * preserves the slot-key string, not the React subtree it was anchored
   * to.
   */
  private _lastSlotForIndex = new Map<number, string>();
  /**
   * Reverse of `_lastSlotForIndex` — for each known slot, the data index
   * it most recently served. Used by `getPooledSlots` so the host can
   * keep pooled slots mounted (rendered offscreen) with their last item,
   * preserving the inner React subtree across release/reclaim cycles.
   */
  private _slotToLastIndex = new Map<string, number>();
  private _visibleSet = new Set<number>();
  private _nextId = 0;

  constructor(label = "pool") {
    this._label = label;
  }

  get activeCount(): number {
    return this._active.size;
  }

  get pooledCount(): number {
    let count = 0;

    for (const keys of this._available.values()) {
      count += keys.length;
    }

    return count;
  }

  reconcile(
    visibleIndices: number[],
    getType: (index: number) => string | number,
  ): Map<number, string> {
    const visibleSet = this._visibleSet;

    visibleSet.clear();

    for (const idx of visibleIndices) {
      visibleSet.add(idx);
    }

    let released = 0;
    let preferredReused = 0;
    let pooled = 0;
    let created = 0;

    for (const [index, key] of this._active) {
      if (!visibleSet.has(index)) {
        this._release(key);
        this._active.delete(index);
        this._slotToLastIndex.set(key, index);
        released++;
      }
    }

    for (const index of visibleIndices) {
      if (!this._active.has(index)) {
        const type = getType(index);
        const preferred = this._lastSlotForIndex.get(index);
        let key: string;

        if (
          preferred !== undefined &&
          this._tryClaimPreferred(type, preferred)
        ) {
          key = preferred;
          preferredReused++;
        } else {
          const before = this._nextId;

          key = this._acquire(type);

          if (this._nextId > before) {
            created++;
          } else {
            pooled++;
          }
        }

        this._active.set(index, key);
      }
    }

    for (const [index, key] of this._active) {
      this._lastSlotForIndex.set(index, key);
    }

    if (import.meta.env.DEV && (released > 0 || preferredReused > 0 || pooled > 0 || created > 0)) {
      console.log(
        `[Pool ${this._label}] released:${released} preferred:${preferredReused} pool:${pooled} new:${created} active:${this._active.size} pooled:${this.pooledCount} types:${this._available.size}`,
      );
    }

    return this._active;
  }

  /**
   * Try to pull `preferred` out of the available pool for the given type.
   * Returns true on success (slot is now claimed for the caller); false
   * if the slot isn't available (was reassigned to a different index, or
   * has a different type now).
   */
  private _tryClaimPreferred(
    type: string | number,
    preferred: string,
  ): boolean {
    if (this._slotTypes.get(preferred) !== type) {
      return false;
    }

    const available = this._available.get(type);

    if (!available) {
      return false;
    }

    const idx = available.indexOf(preferred);

    if (idx < 0) {
      return false;
    }

    available.splice(idx, 1);

    return true;
  }

  getSlotKey(index: number): string | undefined {
    return this._active.get(index);
  }

  /**
   * Enumerate currently-pooled slots paired with the data index they
   * most recently served. Callers should render these slots in the React
   * tree (typically positioned offscreen) so the React subtree — and any
   * nested recycler pools inside it — survives the release/reclaim
   * round-trip.
   */
  getPooledSlots(): Array<{ slotKey: string; lastIndex: number }> {
    const result: Array<{ slotKey: string; lastIndex: number }> = [];

    for (const slots of this._available.values()) {
      for (const slotKey of slots) {
        const lastIndex = this._slotToLastIndex.get(slotKey);

        if (lastIndex !== undefined) {
          result.push({ slotKey, lastIndex });
        }
      }
    }

    return result;
  }

  clear(): void {
    this._active.clear();
    this._available.clear();
    this._slotTypes.clear();
    this._lastSlotForIndex.clear();
    this._slotToLastIndex.clear();
    this._nextId = 0;
  }

  private _acquire(type: string | number): string {
    const available = this._available.get(type);

    if (available && available.length > 0) {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- length > 0 checked above
      return available.pop()!;
    }

    const key = `slot-${this._nextId++}`;

    this._slotTypes.set(key, type);

    return key;
  }

  private _release(key: string): void {
    const type = this._slotTypes.get(key);

    if (type === undefined) {
      return;
    }

    const available = this._available.get(type) ?? [];

    available.push(key);
    this._available.set(type, available);
  }
}

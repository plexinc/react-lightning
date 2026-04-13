export class RecyclerPool {
  /** dataIndex -> slotKey */
  private _active = new Map<number, string>();
  /** itemType -> available slotKeys */
  private _available = new Map<string | number, string[]>();
  /** slotKey -> itemType */
  private _slotTypes = new Map<string, string | number>();
  private _visibleSet = new Set<number>();
  private _nextId = 0;

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

    for (const [index, key] of this._active) {
      if (!visibleSet.has(index)) {
        this._release(key);
        this._active.delete(index);
      }
    }

    for (const index of visibleIndices) {
      if (!this._active.has(index)) {
        const type = getType(index);
        const key = this._acquire(type);
        this._active.set(index, key);
      }
    }

    return this._active;
  }

  getSlotKey(index: number): string | undefined {
    return this._active.get(index);
  }

  clear(): void {
    this._active.clear();
    this._available.clear();
    this._slotTypes.clear();
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

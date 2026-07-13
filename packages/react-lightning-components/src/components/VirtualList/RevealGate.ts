/**
 * Tracks how long each cell's measured main-axis size has held steady.
 *
 * A row measures bottom-up and async: it reports a small placeholder size
 * first, then grows to its real height once its content lays out. Revealing on
 * the first report would show that grow (and shift the rows below it). This gate
 * lets the list keep a cell hidden until its size has been quiet for a window,
 * so it appears once, already at its final height.
 */
export class RevealGate {
  private readonly _size = new Map<string, number>();
  private readonly _stableSince = new Map<string, number>();
  private readonly _firstSeenAt = new Map<string, number>();
  private readonly _revealed = new Set<string>();
  /** Keys whose size Yoga has reported settled (authoritative, skip the quiet window). */
  private readonly _final = new Set<string>();

  /** Record a measured size for a key. Restarts the quiet window on any real change. */
  note(key: string, size: number, now: number): void {
    const prev = this._size.get(key);

    if (prev != null && Math.abs(prev - size) < 1) {
      return;
    }

    this._size.set(key, size);
    this._stableSince.set(key, now);

    if (!this._firstSeenAt.has(key)) {
      this._firstSeenAt.set(key, now);
    }
  }

  /**
   * Record that a cell is visible before it has measured, starting the backstop clock so an
   * unmeasured cell (async content still pending) can't strand the rows below it forever.
   */
  markSeen(key: string, now: number): void {
    if (!this._firstSeenAt.has(key)) {
      this._firstSeenAt.set(key, now);
    }
  }

  /**
   * Latch a key as revealed once it has painted. The gate only guards a cell's
   * first appearance; a later re-measure (e.g. a background refresh of an
   * already-visible row) must NOT hide it again — hiding sets alpha 0, which
   * drops focusability and throws spatial nav off the row.
   */
  markRevealed(key: string): void {
    this._revealed.add(key);
  }

  /**
   * Mark a key's size as authoritative because Yoga reported layout settled
   * (converged to a fixpoint), so `timeUntilSettled` skips the quiet window.
   * Returns true only the first time, so the caller can re-render to paint it.
   */
  markFinal(key: string): boolean {
    if (this._final.has(key)) {
      return false;
    }

    this._final.add(key);

    return true;
  }

  /**
   * ms until the key counts as settled: 0 once it has been revealed, otherwise
   * the sooner of the quiet window elapsing since the last change and the max
   * window since first seen (the backstop for content that never stops
   * changing). A key that is only seen (not yet measured) still counts down
   * the max window; `Infinity` only until the key has been seen at all.
   */
  timeUntilSettled(
    key: string,
    now: number,
    quietMs: number,
    maxMs: number,
  ): number {
    // A fixpoint-settled size is authoritative: reveal without the quiet
    // window. `revealed` latches after paint; `final` short-circuits before it.
    if (this._revealed.has(key) || this._final.has(key)) {
      return 0;
    }

    const stableSince = this._stableSince.get(key);
    const firstSeenAt = this._firstSeenAt.get(key);

    if (stableSince == null) {
      // Seen but never measured: settle by the max window. Never seen: unknown.
      return firstSeenAt == null
        ? Infinity
        : Math.max(0, maxMs - (now - firstSeenAt));
    }

    const seenAt = firstSeenAt ?? stableSince;
    const quietRemaining = Math.max(0, quietMs - (now - stableSince));
    const forcedRemaining = Math.max(0, maxMs - (now - seenAt));

    return Math.min(quietRemaining, forcedRemaining);
  }

  forget(key: string): void {
    this._size.delete(key);
    this._stableSince.delete(key);
    this._firstSeenAt.delete(key);
    this._revealed.delete(key);
    this._final.delete(key);
  }

  clear(): void {
    this._size.clear();
    this._stableSince.clear();
    this._firstSeenAt.clear();
    this._revealed.clear();
    this._final.clear();
  }
}

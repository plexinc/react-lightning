# VirtualList

A virtualized scroll list for Lightning, modeled on FlashList v1. The user is **Willson**; this doc is the authoritative spec for what the component does, why it does it that way, and what's deliberately out of scope. Edit this file to change requirements — Claude reads it when fixing bugs and adding features.

---

## Model

**Two modes, decided by the runtime environment:**

### Pinned mode (no flex ancestor)

When the VL is rendered outside any flex parent (`useIsInFlex() === false`), no yoga is running in this subtree. Cells are absolutely positioned with explicit `w` AND `h` from `LayoutManager` — VL is the *single, exclusive* source of cell positioning and sizing. No FlexRoot, no measurement, no `onResize`. The user's `renderItem` content sizes itself however it wants, but the cell does not adapt; the caller is responsible for accurate `estimatedItemSize` / `overrideItemLayout`. This is the FlashList v1 strict model and has no feedback loops by construction.

### Measured mode (flex ancestor)

When the VL is rendered inside a flex parent (`useIsInFlex() === true`), yoga is already laying out the surrounding tree. In this mode each cell wraps its content in a `FlexRoot`, which:

- gives the user's `renderItem` real flex layout (children can `flexGrow`, `flexDirection`, etc.),
- pins its cross-axis to `cellCrossSize` (so flex-percentage layouts have a concrete cross dimension to compute against),
- leaves its main axis free so yoga shrinks-to-fit content,
- emits `onResize` whenever that natural main-axis size changes.

The cell forwards the main-axis number — and only the main-axis number — to `LayoutManager.reportItemSize(userKey, size)`. Subsequent items reposition based on the measurement.

The crucial discipline in measured mode is **measurement is one-directional and main-axis only** — cross-axis sizes are never aggregated back into VL's layout decisions, and viewport size never depends on cell reports. That's how the prior architecture's three-way feedback loop (cell-cross → `_maxCrossSize` → contentCross → cellCrossSize → cell-cross) is avoided.

### What stays the same in both modes

- The cell wrapper (`<lng-view style={{ position: 'absolute', x, y, w, h }}>`) is positioned exclusively by VL. It has no flex layout itself.
- Cross-axis size of every cell is `cellCrossSize`, derived from viewport, never from cell reports.
- Measurements are stored by `userKey` (the caller's `keyExtractor` output), not by index. Recycling preserves measurements; a cell rendering an item it has measured before uses the cached size on first render.

**Three responsibilities:**

| File | Responsibility |
|---|---|
| `LayoutManager.ts` | Pure layout math. Given data + sizes + cross-axis size, computes per-item offsets in O(n). |
| `VirtualListCell.tsx` | One `<lng-view>` per visible cell with explicit absolute position and dimensions. Wraps user content in `VLCellKeyContext` + `CellBoundsContext` providers. The renderItem subtree persists across slot recycles — the cell wrapper *and* its descendants survive userKey changes; nested VLs read the new userKey via `VLCellKeyContext` and run their cellKey-change branch instead of remounting. |
| `VirtualList.tsx` | Viewport derivation, scroll/focus state, recycling, the React glue. |

Supporting modules: `useScrollHandler.ts` (scroll math, animation, focus-driven scroll), `useViewability.ts` (onViewableItemsChanged), `RecyclerPool.ts` (slot reuse by item type), `parseContentStyle.ts` (RN-style padding props), `VirtualListContext.ts` (the three React contexts).

---

## Public API

`VirtualListProps<T>` (see `VirtualListTypes.ts` for full types):

### Required
- **`data: ReadonlyArray<T>`** — items to render.
- **`renderItem: (info: VirtualListRenderItemInfo<T>) => ReactElement`** — render function. `info` carries `{ item, index, extraData, shouldFocus }`.

### Sizing
- **`estimatedItemSize?: number`** (default `200`) — main-axis size used when no override is provided. **In this model, the estimate IS the size** for items lacking an override — it's not a guess that gets refined. Pick it carefully.
- **`overrideItemLayout?: (layout, item, index, numColumns, extraData) => void`** — set `layout.size` (main-axis) and optionally `layout.span` (multi-column). Called for every layout pass; must be fast.
- **`numColumns?: number`** (default `1`) — multi-column grid. Cells fill columns left-to-right, then advance main-axis by the tallest size in the row.

### Layout
- **`horizontal?: boolean`** (default `false`) — scroll axis.
- **`style?: LightningViewElementStyle`** — applied to the outer FocusGroup. `style.w` / `style.h` set the viewport explicitly (highest priority over parent bounds and self-measure).
- **`contentContainerStyle?: ContentStyle`** — RN-style padding (`padding`, `paddingHorizontal`, `paddingVertical`, `paddingTop` etc) and `backgroundColor`.

### Slots
- **`ListHeaderComponent` / `listHeaderSize`** — header rendered before items, takes `listHeaderSize` main-axis pixels.
- **`ListFooterComponent` / `listFooterSize`** — footer after items.
- **`ListEmptyComponent`** — replaces the entire list when `data.length === 0`.
- **`ItemSeparatorComponent`** — rendered between cells in single-column lists. Skipped after collapsed (size=0) rows.

### Behavior
- **`drawDistance?: number`** (default `250`) — pixels beyond viewport to keep mounted. Larger = smoother scroll, more memory.
- **`keyExtractor?: (item, index) => string`** — used by recycler for slot identity AND by focus restoration. Falls back to `String(index)`.
- **`getItemType?: (item, index, extraData) => string | number`** — items of the same type share a recycler pool.
- **`extraData?: unknown`** — opaque value forwarded to `renderItem`. Changing it forces re-layout.
- **`initialScrollIndex` / `initialScrollIndexParams`** — scroll to a specific index on mount.
- **`snapToAlignment?: 'start' | 'center' | 'end'`** (default `'start'`) — where focused items land in the viewport.
- **`animationDuration?: number`** (default `300`) — scroll animation duration.
- **`onScroll` / `onEndReached` / `onEndReachedThreshold`** — scroll callbacks.
- **`onViewableItemsChanged` / `viewabilityConfig`** — viewability tracking.
- **`onLoad`** — fires once when first items render (with elapsed ms since mount).
- **`onLayout`** — fires when content dimensions change.
- **`autoFocus` / `trapFocus{Up,Right,Down,Left}`** — forwarded to the FocusGroup wrapping the list.

### Imperative — `VirtualListRef`
- `scrollToIndex({ index, animated?, viewPosition?, viewOffset? })`
- `scrollToOffset({ offset, animated? })`
- `scrollToEnd({ animated? })`
- `getScrollOffset()`
- `getVisibleRange()`

---

## Sizing contract

**Main-axis size priority** (highest wins):

1. **Measured size** *(measured mode only)* — the cell's last reported main-axis dimension, keyed by `userKey`.
2. **`overrideItemLayout` returns `layout.size`**.
3. **Data entry is `null` / `undefined`** — size is forced to `0`, cell is not rendered.
4. **First-measured size** *(measured mode only)* — once any cell has reported a measurement, that first value is used as the fallback for *unmeasured* cells in place of `estimatedItemSize`. Locked on first; later measurements update individual cells via the per-key path but do not change the implicit fallback.
5. **Fallback: `estimatedItemSize`** — used only before the first measurement lands (and always in pinned mode, where no measurements happen).

The first-measured fallback is what makes `estimatedItemSize` matter less in measured mode: a slightly-off estimate produces visible reflow only on the very first cell. After that, the second and subsequent cells use the first cell's actual rendered size as their starting point — usually a much closer match to the real content size, so each cell's per-key measurement update moves things only a few pixels (or not at all). Locking on the *first* measurement (rather than tracking a running average or the most recent) is deliberate: a moving estimate would cascade-rerender every later unmeasured item every time someone new measured, defeating the goal.

In **pinned mode** (no flex ancestor), step 1 doesn't apply: cells never report sizes, so the chain effectively skips to step 2/3/4. Every cell is exactly the size LayoutManager dictated. Get your `estimatedItemSize` / `overrideItemLayout` right or you'll see gaps/overflow.

In **measured mode** (flex ancestor), measurement wins over override because real rendered size is authoritative — if the user's content renders to 250px and the override said 200px, going with 250 prevents overflow into the next item. If the caller wants to *force* a size and prevent measurement updates, they need to render content sized to that exact dimension (the cell measures whatever content actually renders).

**Cross-axis size** is *never* measured in either mode. Every item's cross-axis size equals `cellCrossSize` (derived from viewport). Span is the one exception — `layout.span = 2` makes a multi-column item occupy 2 columns of `cellCrossSize` width. If a user's content overflows the cross-axis, it paints outside the cell wrapper but does not affect `cellCrossSize` for any item.

**First-render behavior** *(measured mode)*. Cells whose `userKey` has never been measured fall through to override → estimate. They render at that estimated main-axis size; once yoga lays them out and `onResize` fires, the cell reports its actual size, LayoutManager updates, and following items reposition. So a list with accurate `estimatedItemSize` (or `overrideItemLayout`) renders correctly from frame 1; lists with bad estimates show a brief reflow on first paint.

**Recycling and measurement.** Measurements are keyed by `userKey`, not index, so a recycled cell reuses its prior measurement immediately. A cell rendering an item it has measured before paints at the right size on first paint — no re-measure needed unless content actually changed.

**Two-layer commit dampening.** Measurement reports go through one of two paths depending on whether a scroll/focus-snap animation is in flight:

1. **Animation batching** (top layer). When `useScrollHandler` fires `onAnimationStart`, VL flips LM into batching mode (`setBatching(true)`). While batched, every report goes into `_batchedSizes` (latest wins per `userKey`) and bypasses the dampening path entirely — the animation is the consumer's clear signal that intermediate yoga measurements aren't worth committing. On `onAnimationEnd`, `setBatching(false)` drains the batch directly into `_measuredSizes` in a single step and bumps `layoutVersion` once. The layout stays frozen for the visible duration of the animation, then settles in one commit when it ends.

2. **Per-key stability dampening** (below the batching layer). Outside of animations, first measurements apply immediately. Subsequent *changes* to an already-stored measurement go through a `_STABILITY_MS` (currently 120ms) wait: a different value starts a "pending" timer; further reports of the same value advance toward confirmation, and only after the value has been stable for the window does it commit to layout. A different intermediate value restarts the timer. A backstop `setTimeout` is also scheduled per pending entry so values commit even if the cell pushes once and goes quiet (props stable, no further re-renders). This filters transient oscillations from user content that re-measures asynchronously after a scroll has already settled — without the dampener, every spurious yoga measurement propagates to layout offsets and rows below jump on every scroll tick.

The backstop wakes VL through `LayoutManager.setOnChange(cb)` — VL registers a callback at construction that calls `setLayoutVersion(v => v + 1)`. The synchronous-commit paths (immediate first-measurement, stable repeat-after-window) instead return `true` from `reportItemSize` so VL bumps inline. The two paths are mutually exclusive: while `_batching` is true, the dampening map is cleared and pending timers are cancelled (the upcoming flush will replace those values anyway).

**Imperative scroll position is the single source of truth during scroll animations.** When `isScrollAnimating` is true, `contentStyle` deliberately omits `x`/`y` so React reconciliation can't clobber the running `el.node.animate(...)` interpolation. The `stopped` callback in `useScrollHandler` pins the final `node.x`/`node.y` synchronously; the subsequent render with `isScrollAnimating === false` writes the matching declarative value. `committedScrollOffset` is updated unconditionally on every `scrollToOffset` call so the post-animation render's declarative `x`/`y` matches the pinned position even when a hop lands inside the same visible range as the prior commit (e.g. a snap-to-edge from the second item to the first). Without that, the next render would re-apply a stale offset via style and snap content past the interpolated position.

**Measurements persist across data identity changes.** A new `data` array reference (e.g. from a tab switch or a parent re-render that recomputes the array) does not wipe measurements. Cells whose `userKey` survives the change reuse their cached size — items don't shift on re-render. Callers who truly need to invalidate (orientation change, theme swap that materially affects content sizing) can call `layoutManager.clearMeasurements()` imperatively. If user-content's measured size genuinely fluctuates during a session (focus animations, async-loaded content), each reported value updates the layout — that's intentional, since the alternative (locking to max) leaves visible empty space when content is at smaller sizes.

**Skipping cells when `renderItem` returns null.** If `renderItem` returns `null`, the cell renders nothing — no `FocusGroup` wrapper, no separator, no DOM — *and* the cell calls `LayoutManager.reportItemEmpty(userKey)` via `useLayoutEffect`, which collapses the row to zero main-axis size. Following items close ranks around the gap. This is for callers whose data shape doesn't permit a clean `null` entry but still has logically-empty rows (e.g. `{ id, label, items: [] }` with `items.length === 0` meaning "render nothing").

The `reportItemEmpty` path is deliberately separate from `reportItemSize`. The size path rejects 0 to filter transient FlexRoot reports during recycle (FlexRoot briefly measures 0 between unmount and remount of its children); accepting those would collapse legitimate rows. `reportItemEmpty` is the explicit, intent-bearing alternative — only called from the renderItem-null code path.

---

## Viewport resolution

`viewportSize` is the main-axis dimension (the scroll axis). `viewportCrossSize` is the cross-axis. They resolve via separate priority chains because the main axis is normally driven by the parent's flex (so `measuredSize` is reliable there) while the cross axis can be content-driven for unbounded layouts.

**Main axis:**

1. `style.w` / `style.h` (caller-provided)
2. `parentCellBounds.width` / `.height` (from an enclosing `VirtualListCell`)
3. `measuredSize` (FocusGroup `onResize`)

**Cross axis** — order depends on orientation:

**Vertical VL:**

1. `style.w` (caller-provided)
2. `parentCellBounds.width`
3. `measuredSize.w` (FocusGroup `onResize` — reliable here because `outerStyle` has `flexGrow: 1` so the parent's flex allocates the cross dim)
4. `maxContentCross` (max cross dim reported by any cell's content)
5. `estimatedItemSize`

**Horizontal VL:**

1. `style.h` (caller-provided)
2. `maxContentCross` — max cross dim reported by any cell's content
3. `parentCellBounds.height`
4. `measuredSize.h`
5. `estimatedItemSize`

The asymmetry is load-bearing. In a vertical VL nested inside a column-flex parent, `parentCellBounds.width` and `measuredSize.w` both report the full allocated column width — the right size for cells to fill. Cell-content cross sizes (per-row natural widths) are typically larger than the viewport in app-style rows that wrap inner horizontal scrollers, so trusting them would set `cellCrossSize` to the inner scroller's full `totalContentSize` instead of the viewport.

In a horizontal VL nested inside a parent section that contains other siblings (a title, a status row, etc.), `parentCellBounds.height` is the *outer cell's* full height — `title + innerVL + other`. Using that as the inner VL's cross dim sizes the cells to include the chrome height too. Worse, when the outer cell's measurement bounces (as the user's section component re-measures during scroll/focus animations), the inner VL's `cellCrossSize` bounces with it, and cells are sometimes too tall (gap), sometimes too short (overflow). Trusting the cells' own measured cross instead — `maxContentCross` — gives `cellCrossSize` the cards' natural height regardless of what the outer section measures around them. Only when no cell has measured yet do we fall back to parent/measured/estimate.

`maxContentCross` is monotonic per-dataset: once a cell reports cross=N, the VL stays at N or larger until `data` / `extraData` identity changes (at which point the value resets so a fresh, smaller dataset isn't stuck at the prior dataset's max).

**`cellCrossSize = (viewportCrossSize - crossPadding) / numColumns`**

For a horizontal VL, `viewportCrossSize` is content-driven once any cell has reported (per the priority chain above), so this formula naturally yields cells sized to their actual content. For a vertical VL it yields cells filling the parent-allocated column.

For a list with no explicit cross AND no flex ancestor (pinned mode), no measurement happens — the chain falls through to `estimatedItemSize`. In that case the caller MUST pass an `estimatedItemSize` that makes sense as a cross-axis dim, OR set `style` explicitly. Pinned-mode horizontal VLs essentially require `style.h` to be useful.

---

## Cell rendering

`VirtualListCell` produces a fully-pinned `FocusGroup` cell wrapper, then either a plain or a flex-wrapped content subtree depending on `isInFlex`:

```jsx
<FocusGroup
  ref={cellElementRef}
  autoFocus={shouldFocus}
  style={{
    position: 'absolute',
    x, y,
    // Both axes pinned by VL — cell wrapper has NO flex of its own.
    w: horizontal ? size : crossSize,
    h: horizontal ? crossSize : size,
  }}
>
  {isInFlex ? (
    <FlexRoot
      onResize={(e) => onItemSizeChange(userKey, horizontal ? e.w : e.h)}
    >
      <VLCellKeyContext.Provider value={userKey}>
        <CellBoundsContext.Provider value={cellBounds}>
          {renderedItem}
        </CellBoundsContext.Provider>
      </VLCellKeyContext.Provider>
    </FlexRoot>
  ) : (
    /* plain content — no flex, no measurement */
    <VLCellKeyContext.Provider value={userKey}>
      <CellBoundsContext.Provider value={cellBounds}>
        {renderedItem}
      </CellBoundsContext.Provider>
    </VLCellKeyContext.Provider>
  )}
  {/* optional separator, position:absolute */}
</FocusGroup>
```

The renderedItem subtree is **not** wrapped in a keyed Fragment. Slot recycle changes `userKey` but the React tree at and below the cell wrapper persists — including the user's section component and any nested VLs inside it. That preservation is what lets nested-VL `LayoutManager` and `RecyclerPool` instances survive the round-trip.

**Why the cell wrapper has no flex.** The cell is positioned and sized exclusively by VL. Adding flex to it would either (a) drag it into the parent's flex flow (it shouldn't be — `position: 'absolute'` keeps it independent) or (b) start a flex subtree at the wrong layer. Either way, you'd be re-introducing the kinds of two-source-of-truth bugs the architecture is designed to prevent. Keep the cell wrapper a plain absolutely-positioned `<lng-view>`.

**Why the cell wrapper is a `FocusGroup` (not just a focusable).** Each cell is its own focus group, nested inside the VL's outer FocusGroup. Three reasons:

1. **Default focus target without effort from the caller.** A `renderItem` that doesn't wrap its content in a focusable still gets navigation behaviour — focus lands on the cell wrapper. Useful for display-only items, icon grids, etc.
2. **Stable focus home during recycle.** The cell wrapper persists across slot recycles. If the user's renderItem changes shape between content swaps (e.g. one row has an inner focusable and another renders a static label), focus has a guaranteed landing point on the cell wrapper itself rather than escaping to a sibling row.
3. **Containment for spatial nav.** When a cell has multiple focusables (e.g., a row with action buttons), arrow keys stay within the cell until there's no candidate, then bubble to the VL's outer FocusGroup for cross-cell navigation. Without the per-cell group, every focusable in every cell competes in one flat space and spatial nav can jump unexpectedly across cells.

When the caller's `renderItem` includes an inner focusable, that inner is added to FocusManager as a child of the cell's group (not the VL's). The inner becomes the leaf-focused element; `onChildFocused` cascades up through the cell group to the VL's outer group, where `handleVLFocus` runs the snap-alignment scroll and writes to the state cache. Existing focus-driven behaviour is preserved — nesting is purely additive.

**Why FlexRoot is conditional on `isInFlex`.** When the VL has no flex ancestor, no yoga is running in this subtree. Adding a FlexRoot just for measurement would force yoga to spin up — pure overhead with no benefit, since the user's content isn't using flex either. So we skip it; the cell is silent and pinned.

**Why FlexRoot is unpinned on both axes.** Yoga shrinks the FlexRoot to fit content on both axes. The cell forwards both dimensions: main goes into `LayoutManager`'s per-key measurement store; cross feeds VL's `maxContentCross` fallback (used only when no explicit cross source is available). Pinning cross to `cellCrossSize` would create the prior architecture's feedback loop — cell echoes its own pinned size back to VL, which uses that to compute the pin, etc. Leaving both unpinned lets cell content drive sizing without a loop. Tradeoff: flex-percentage layouts on cross axis (e.g. `width: '100%'` inside a horizontal VL's cell) won't work because the parent has no fixed cross dim — callers needing those should set `style.h` (or `.w`) on the VL, which flips the chain into the explicit branch.

**Why measure via `onResize`?** Lightning's universal `NodeResizeObserver` fires `onResize` whenever a node's size changes. The cell ignores the cross-axis dimension and only reports a positive main-axis number; cross-axis and zero/negative reports are filtered before they reach VL.

**Why a one-shot RAF push on `userKey` change.** `NodeResizeObserver` (driving `onResize`) only fires when the FlexRoot's actual size changes. Two scenarios miss measurements when relying on it alone:

1. **Same-size recycle.** A slot reassigns from item N to item M with identical dimensions. FlexRoot's size doesn't change → no observer event → item M's `userKey` never gets a measurement under the new key.
2. **Empty → non-empty transition.** The cell previously rendered null (no FlexRoot at all); now it renders content. There's nothing for the observer to compare against on the new mount.

The fix: a `useLayoutEffect` keyed on `[userKey, isInFlex, isEmpty, horizontal, onItemSizeChange, onContentCrossLayout]` that schedules a RAF when the userKey (or its preconditions) changes, reads `flexRootRef.current.node.w/h` after yoga has laid out, and reports those dimensions. RAF defers until post-layout so the values reflect the post-render dimensions. Cleanup cancels the prior frame's RAF.

This is intentionally **not** an every-render push. Once a cell has reported its size for a given `userKey`, ongoing size changes flow exclusively through `onResize` (which dedupes by definition). The recently-removed every-render variant was contributing to mid-scroll thrashing — every cell's mainOffset change triggered a re-render, every re-render scheduled a RAF, and every RAF pushed a possibly-transient yoga snapshot back into LM. Scoping to userKey changes plus `onResize` reduces the noise without losing the same-size-recycle path.

**Why imperative `cellElementRef.current.focus()` on `shouldFocus` false → true.** `useFocus` claims focus through the focus manager only at `addElement` time (mount). On a persisting cell whose `autoFocus` prop flips from false to true, `setAutoFocus` only updates the property — it does not actively claim focus. Without an alternative trigger, focus restoration after a slot recycle silently fails: the cell now "wants" focus but nothing pulls it.

The cell holds a ref to its outer FocusGroup's element (`cellElementRef`) and a `prevShouldFocusRef` to detect transitions. A `useLayoutEffect` keyed on `[shouldFocus]` calls `cellElementRef.current.focus()` exactly once per false → true transition. The mount-time claim still goes through `FocusGroup`'s `autoFocus` prop (via `useFocus → addElement`); the imperative path fires only for already-mounted cells. This replaces the prior `<Fragment key={userKey}>` mechanism, which forced the renderItem subtree to remount on every userKey change so the user's inner focusables would re-fire their own `autoFocus` — that approach also tore down nested-VL `LayoutManager`/`RecyclerPool` state on every recycle, which is what we now preserve.

**Why `CellBoundsContext`?** Nested VLs need to know their bounded width and height without measurement of their own. The cell hands them down through context. Both numbers come straight from layout (estimate, override, or measurement) so a nested list's viewport is reasonable from frame 1.

---

## Separators

`ItemSeparatorComponent` renders between cells. The separator is positioned `position: absolute` inside the cell wrapper at the cell's main-axis trailing edge, so it doesn't participate in cell measurement.

**One measurement, all cells.** Separators are a single component — every instance is the same shape. In flex (measured) mode, every cell that renders a separator reports its size up to VL, but VL keeps a single `separatorSize` state and dedupes; only the first non-zero report (or genuine subsequent change) hits state. That value flows into `LayoutManager.updateConfig({ separatorSize })`, which adds the gap into per-item offsets.

In pinned (non-flex) mode there is no measurement: `separatorSize` stays at the last value VL knows about (initial: 0). If the caller wants a non-zero gap with no flex ancestor, they need to size the separator by other means and the gap will appear visually but won't be reflected in LM offsets — meaning following items overlap. In practice this is fine because non-flex consumers tend to use accurate `overrideItemLayout` that already includes the separator gap.

LM only adds `separatorSize` between adjacent cells in single-column lists. Multi-column lists do not auto-insert separators between rows or columns.

---

## Focus restoration

`VirtualList` persists `focusedIndex` to the parent's state cache (`VLStateCacheContext`) so revisiting a row restores focus to the last item the user navigated to. There are two flows: in-list navigation (user moves focus around) and recycle entry (the cell holding this VL just got a new identity, restore prior state).

### In-list navigation flow

User presses arrow → FocusGroup fires `onChildFocused(child)` → `handleVLFocus(child)`:

1. **Compute target index** from `child.getRelativePosition(contentRef)`. Child positions inside contentRef are scroll-independent (cells are absolutely positioned inside contentRef; only contentRef's own x/y changes for scroll), so this is safe to do before scrolling.
2. **Run `handleChildFocused(child)`** — that's the snap-alignment scroll inside `useScrollHandler`. It calls `scrollToOffset(target, animated)`, which synchronously sets `scrollOffsetRef.current = clamp(target)` and kicks off the animation. So even though the visual scroll is async, the ref is already updated.
3. **Write to cache** with `{ scrollOffset: scrollOffsetRef.current, focusedIndex: targetIdx }`. Because step 2 already updated the ref, this captures the *post-alignment* offset.
4. **Update `focusedIndexRef.current`**.

The order matters. If you write before step 2, you capture the pre-scroll offset. On restore, `resetScroll` puts the row at that pre-scroll offset, autoFocus fires, `handleChildFocused` runs and scrolls to the *correct* offset — but the user sees the row land slightly off and then jump. Two visits are needed for the cache to converge. Doing alignment first and writing after is what makes the first visit land cleanly.

### Recycle entry flow

The enclosing cell's `userKey` (received via `VLCellKeyContext`) changes — meaning the parent VL recycled this row into a different item. The VL's React identity persists across this transition (no remount), so the branch fires on the persisting component instance:

1. **Detect the change** via `prevCellKeyRef.current !== cellKey` (during render, not in an effect — we want the current render to use the new state, not flash the old).
2. **Save outgoing state** to the parent's cache under `prevCellKeyRef.current`, capturing `scrollOffsetRef.current`, `focusedIndexRef.current`, and **a snapshot of `LayoutManager.getMeasurements()`**. The measurement snapshot survives the recycle so the row's inner cells don't have to re-measure from estimate when the row becomes visible again — without it, every recycle-back would cascade first-measurement commits through every following item.
3. **Apply incoming config synchronously** via `layoutManager.updateConfig({ data, ..., separatorSize })`. Without this, LM's `_data` would still be the prior content (the `useLayoutEffect` that calls `updateConfig` hasn't fired yet), so `_resolveSize` would derive userKeys from the old data and miss every entry in the about-to-be-restored measurements map. The result would be one frame of estimate-based layout before the effect catches up — visible flicker.
4. **Read incoming state** from the cache under the new `cellKey`.
5. **`resetScroll(incoming.scrollOffset ?? 0)`** — synchronously updates `scrollOffsetRef`, applies the position to contentRef directly, resets the visible-range cache.
6. **`setFocusedIndex(incoming.focusedIndex ?? 0)`** — cells about to render will pick this up as `shouldFocus`. The `?? 0` fallback is load-bearing: the inner FG's `focusedElement` is React-element-stable across recycle (each cell at its slotKey persists the same Lightning element), so it carries stale memory pointing at whichever cell was last focused under the **previous** cellKey. With `focusedIndex=undefined` no cell flips `shouldFocus` false → true, `VirtualListCell`'s `setFocusedChild` layoutEffect never fires, and the next time the user navigates into this row the FG path traversal lands on the stale cell instead of cell 0. Defaulting to 0 makes cell 0 claim `setFocusedChild` on the next layoutEffect, matching the fresh-mount behavior where `addElement` sets cell 0 as the default `focusedElement` (first focusable child added wins).
7. **`layoutManager.setMeasurements(incoming.measurements)`** if the incoming entry has them, else `layoutManager.clearMeasurements()`. `setMeasurements` also clears any in-flight dampening (`_pendingSizes`, `_pendingTimers`) and batched (`_batchedSizes`) state — pending entries from the prior content are no longer relevant under the restored measurement set.
8. **`skipNextFocusRef.current = true`** — the next `onChildFocused` event is going to be the FocusGroup re-establishing focus on entry; we don't want that overwriting the restored index. We still call `handleChildFocused` so the snap-alignment runs (if the focused item is currently outside the snap window for some reason), but we skip the cache update.
9. **`prevCellKeyRef.current = cellKey`**.

Because step 3 of the in-list flow captured the post-alignment offset, step 5 here restores to a value that — when autoFocus fires and `handleChildFocused` runs — produces a no-op scroll. No animation, no flicker.

### State and invariants

- **Refs, not state.** `focusedIndexRef`, `skipNextFocusRef`, `prevCellKeyRef`, `scrollOffsetRef`. State-based tracking caused setState-async timing bugs where the persistence useEffect captured stale focusedIndex.
- **`shouldFocus` is read at render time.** On initial cell mount, `FocusGroup`'s `autoFocus={shouldFocus}` triggers `useFocus → addElement` with `autoFocus: true`, which claims focus through the focus manager. On a persisting cell whose `shouldFocus` flips false → true, the imperative `cellElementRef.current.focus()` in `VirtualListCell`'s layoutEffect is what actually moves focus.
- **Top-level VLs (no `cellKey`) skip persistence entirely.** No outgoing save, no incoming restore, no cache writes from `handleVLFocus`.

---

## State persistence

`VirtualList` provides `VLStateCacheContext` to its descendants — a `Map<userKey, VLPersistedState>` keyed by the parent VL's userKey for that row. Each entry holds:

```ts
interface VLPersistedState {
  scrollOffset: number;
  focusedIndex?: number;
  measurements?: Map<string, number>;
}
```

Three write paths, with different timing characteristics:

| When | Reads what | Why |
|---|---|---|
| `handleVLFocus`, after `handleChildFocused` | `scrollOffsetRef.current` (latest, synchronous) + `focusedIndexRef.current` + `layoutManager.getMeasurements()` | Captures every focus-driven scroll precisely — including sub-range scrolls that don't commit a new visible range. |
| `useEffect` on `committedScrollOffset` | `committedScrollOffset` (state, updated when range changes) + `focusedIndexRef.current` + `layoutManager.getMeasurements()` | Backstop for non-focus scrolls (touch/wheel/imperative `scrollToOffset`). Doesn't fire for sub-range scrolls. |
| Cell-key-change block (during render) | `scrollOffsetRef.current` + `focusedIndexRef.current` + `layoutManager.getMeasurements()` | Saves outgoing state right before restoring incoming, ensuring the most recent measurements survive even if no in-life save fired since the last update. |

The focus-event write must run *after* `handleChildFocused` so that `scrollOffsetRef.current` reflects the snap-aligned offset, not the pre-scroll one. See [Focus restoration → In-list navigation flow](#in-list-navigation-flow) for the full rationale.

The cell-key-change block runs as derived state (set during render), not in an effect, so the current render uses the new state — avoids a flash of stale scroll/focus.

**Initial mount restoration.** When VL initializes its `LayoutManager`, it checks `parentStateCache.get(cellKey)` for an `initialRestoredState` and, if `measurements` is present, calls `layoutManager.setMeasurements(restored)` immediately — before the first cell render. The cell wrappers in this render get layout offsets computed against the restored measurements, so a recycled-into-existence VL paints at the right sizes from frame 1. Without this, the first frame would use estimates and then reflow once measurements re-pushed.

`getMeasurements()` returns a copy (so the cache snapshot doesn't alias the live LM state). `setMeasurements(snapshot)` replaces `_measuredSizes`, clears any pending dampening / batched entries, and marks layout dirty. It deliberately does NOT call `_onChange` because the surrounding code (cell-key-change branch or LM init) is already inside a render that will re-render naturally.

Top-level VLs (no `cellKey`) don't persist anything.

---

## Recycling

`RecyclerPool` reconciles visible indices to React-stable slot keys, grouped by `getItemType`. Items of the same type reuse each other's React subtrees. The pool's constructor takes an optional `label` (e.g. `"v"` for the outer vertical VL, `"h"` for an inner horizontal) used in debug logging — `[Pool v] released:1 preferred:1 ...`.

**Subtree persists on content swap.** The cell's outer `FocusGroup` is React-keyed by slot, so the wrapper persists across recycles. There is **no keyed Fragment** under the wrapper — when `userKey` changes, the renderedItem subtree (and any nested VL inside it) reconciles in place rather than remounting. Nested VLs detect the new `userKey` via `VLCellKeyContext` and run their cellKey-change branch (save outgoing state, apply new config, restore incoming state) on the same component instance. Their `LayoutManager`, `RecyclerPool`, and any other useRef-backed state survives the round-trip.

**Per-index slot stability.** When an index leaves visibility and later comes back, `RecyclerPool` tries to give it back its **previous slot** via `_lastSlotForIndex`, not whichever one happens to be at the top of the LIFO pool. Without this preference, the same item gets a different `slotKey` on round-trip, React unmounts the entire `VirtualListCell`, and any descendant state is destroyed and reconstructed. The reconstruction goes through transient measurement states that ripple up to the parent VL and cause visible thrashing on scroll-back. With the preference, the round-trip is a no-op for the React tree — same `slotKey`, same component instance, same descendant state.

When the preferred slot isn't available — e.g. it's been reassigned to a different item during the absence — `_acquire` falls back to LIFO pop from the type pool. The cell at that slot was previously rendering some other index; React preserves the cell instance, the userKey changes, and the cell's renderedItem reconciles to the new content. State below the cell still persists (because the cell itself does), so the scroll-back to a stale-preferred index is still better than the no-preservation path.

**Pooled-slot mounting hook.** `RecyclerPool.getPooledSlots()` returns `Array<{ slotKey, lastIndex }>` — every slot currently sitting in the available pool, paired with the data index it most recently served (tracked via `_slotToLastIndex`, the reverse of `_lastSlotForIndex`). Callers can render these slots in the React tree positioned offscreen, so the React subtree at each pooled slot — and any nested recycler pools inside it — stays mounted across release/reclaim cycles. The pool itself preserves only the slot-key string and last-served index; without the host rendering pooled slots, the React component instances at those slots are unmounted by reconciliation as soon as they leave `visibleIndices`. The wiring in `VirtualList.tsx` may render only currently-visible slots (so pooled cells unmount and re-mount on round-trip) or render pooled slots offscreen too (so the entire React tree below the pool persists end-to-end) — see the JSX for which mode is in effect. The `pooled` prop on `VirtualListCell` exists for the latter mode: when a cell is held in the pool, the host passes `pooled={true}` so the cell's outer `FocusGroup` is disabled and spatial navigation skips both the cell and its descendants.

If you don't pass `getItemType`, all cells share one pool — fine for uniform lists.

---

## What's not supported

By design, this VL **does not**:

- Measure or aggregate cross-axis sizes. Cross is always `cellCrossSize` from viewport. If your content needs more cross space, set `style.w/h` (top-level) or `numColumns`, or accept overflow.
- Auto-derive viewport size from content. Viewport flows: explicit `style` → `parentCellBounds` → self-measured FocusGroup. It never depends on cell reports.
- Offer per-cell cross-axis overrides. `overrideItemLayout.size` is main-axis only; `span` is the only multi-column knob.
- Compute a "running average" of measured sizes. Each measurement is stored verbatim per `userKey`.

If you find yourself adding cross-axis aggregation or letting cell reports drive viewport, stop and reread [Why measurement is main-axis only](#why-measurement-is-main-axis-only).

---

## Why measurement is main-axis only

The pre-rewrite VL measured both axes. That spawned three coupled measurement systems:

1. **Cell-level** (`FlexRoot` + `NodeResizeObserver`) — each cell's content was observed via yoga and reported on both axes to LayoutManager.
2. **Viewport-level** (`FocusGroup.onResize` → `measuredSize`) — VL watched its own container size for `viewportCrossSize`.
3. **Content-derived cross-size** (`_maxCrossSize` → `contentCross` → `finalCross` → `cellCrossSize`) — VL aggregated cell-reported cross sizes back into its own sizing decisions.

The three formed loops: cells report cross → LayoutManager aggregates → VL sets contentRef.h → FocusGroup measures → viewportCrossSize updates → cellCrossSize re-derived → cells re-render at new cross size → cells report different cross size. Symptoms: backward-scroll jank, recycle flickers, sizes "stuck" at initial estimate.

The current design measures only main-axis. Cross is unilaterally `cellCrossSize` from viewport — cells don't report it, LayoutManager doesn't aggregate it, VL doesn't derive viewport from it. That's the entire fix.

---

## Canonical examples

- **Top-level uniform list:** Storybook `VirtualList.stories.tsx` → `Vertical`, `Horizontal`. Pass `estimatedItemSize` matching the actual size, set `style.w/h`.
- **Multi-column grid:** Storybook → `Grid`, `OverrideItemLayout`. Set `numColumns`, optionally `overrideItemLayout` for per-item span/size.
- **Empty / collapsed rows:** Either set `data[i] = null` (auto-collapses), or have `overrideItemLayout` return `layout.size = 0` for some items.
- **Variable-height rows:** `apps/react-lightning-example/src/pages/NestedListPage.tsx` — outer VL uses `overrideItemLayout` to return `ROW_HEIGHT_NORMAL` / `ROW_HEIGHT_SMALL` / `0` per row.
- **Nested horizontal-in-vertical:** `NestedListPage.tsx` again. Inner VL has explicit `style.h` matching its item height; could also inherit from `parentCellBounds.height` if the cell is sized to fit.
- **Initial scroll & imperative scroll:** Storybook → `InitialScrollIndex`, `ImperativeScrolling`.
- **Item types & recycling:** Storybook → `ItemTypes` (mixed image/text rows reused per pool).
- **Plex production:** `react-native-client` consumers go through wrappers (`FlashList.lng.tsx` etc) — those wrappers are responsible for translating their callers' size hints into `estimatedItemSize` / `overrideItemLayout`.

---

## Invariants and pitfalls

- **`estimatedItemSize` is critical in pinned mode** (no flex ancestor) — it IS the size for items without an override. In measured mode, a bad estimate only affects items rendered *before the very first cell measures*; once any cell reports its size, that becomes the implicit fallback for the rest of the unmeasured items.
- **`overrideItemLayout` is hot.** It's called for every item on every layout. Don't allocate or do expensive work inside.
- **`keyExtractor` matters.** Measurements are keyed by it. Without one, indices are used (`String(index)`) — which means measurements don't survive data inserts/removes that shift indices. For dynamic lists, supply a stable `keyExtractor`.
- **The cell's main-axis is whatever yoga lays out.** If your `renderItem` returns content with explicit dimensions matching your `estimatedItemSize`/`overrideItemLayout`, the cell measures to that. If they disagree, measurement wins on subsequent renders.
- **The cell's cross-axis is fixed at `cellCrossSize`.** Content overflowing the cross axis paints outside the cell wrapper. Either fit content to `cellCrossSize` or pick a larger viewport / smaller `numColumns`.
- **Top-level VLs should set `style.w/h` explicitly** when known. Self-measurement via `FocusGroup.onResize` works but adds a render cycle.
- **Nested VLs without `style.h` (or `style.w`) inherit from `parentCellBounds`.** That's the cell wrapper's current size — which after measurement is the cell's *content* size (estimate before, measured after). For a horizontal inner VL inside a row, it's usually cleaner to set `style.h` on the inner VL to its actual item height rather than rely on the parent cell sizing.
- **`focusedIndexRef` is read at cell render time.** Mount-time autoFocus chains through `FocusGroup → useFocus → addElement` claim focus on first paint. For a persisting cell whose `shouldFocus` flips false → true (slot recycle to a new content that should be focused), the imperative `cellElementRef.current.focus()` in `VirtualListCell`'s layoutEffect is what actually moves focus.
- **Don't add focusedIndex to the persistence `useEffect` deps.** The ref-based direct write in `handleVLFocus` covers per-focus updates; adding the dep reintroduces the setState-async race.
- **In `handleVLFocus`, run `handleChildFocused` BEFORE writing to the cache.** `scrollToOffset` synchronously updates `scrollOffsetRef.current` to the snap-aligned target, so the subsequent cache write captures the post-alignment offset. Inverting this order forces a two-visit convergence on restore — the row lands at the wrong offset and only fixes itself on a second focus event.
- **The `useLayoutEffect` RAF size-push in `VirtualListCell` is keyed on `[userKey, isInFlex, isEmpty, horizontal, onItemSizeChange, onContentCrossLayout]`.** Don't widen to `[]` (every-render): that contributed to mid-scroll thrashing by pushing transient yoga snapshots whenever a sibling cell's update re-flowed this one. Don't narrow further than `userKey`: same-size recycles need at least the userKey transition to push the new key's measurement.
- **Cell wrappers are `FocusGroup`s; don't downgrade them to `useFocus` or to plain views.** Per-cell focus groups give every cell a baseline focus target, contain spatial nav for multi-focusable cells, and provide the ref target for the imperative `focus()` call on `shouldFocus` transitions.
- **Don't re-introduce a keyed `<Fragment key={userKey}>` around `renderedItem`.** The previous version did exactly that to make `useFocus.autoFocus` re-fire on recycle, but it tore down the entire renderItem subtree (including any nested VLs and their `LayoutManager`/`RecyclerPool` state) on every content swap. The current architecture relies on subtree persistence + nested-VL cellKey-change handling to preserve state. Replacing the Fragment with imperative focus is what enables that.
- **Don't call `setMeasurements` outside the cellKey-change branch or LM init.** It clears all in-flight dampening / batching state, which is correct as a "we're switching content, throw away pending observations" reset but would be a bug if called mid-flight on stable content.
- **Don't re-apply `contentStyle.x/y` while `isScrollAnimating` is true.** The imperative `node.animate()` is the source of truth for position during the animation; re-applying the target via React style on a mid-animation re-render snaps the content past the interpolated value.
- **Reject zero-size measurements.** A cell briefly measuring 0 (mid-recycle, content unmount) must not pollute the cache. `LayoutManager.reportItemSize` rejects `size <= 0`. Genuinely-empty rows go through `reportItemEmpty` instead.
- **Don't aggregate cross-axis from cells.** The single rule that prevents the prior architecture's loops.

# VirtualList

A virtualized scroll list for Lightning, modeled on FlashList v1. This doc is the authoritative spec for what the component does, why it does it that way, and what's deliberately out of scope. Edit this file to change requirements — Claude reads it when fixing bugs and adding features.

---

## Model

**Two modes, decided by the runtime environment:**

### Pinned mode (no flex ancestor)

When the VL is rendered outside any flex parent (`useIsInFlex() === false`), no yoga is running in this subtree. Cells are absolutely positioned with explicit `w` AND `h` from `LayoutManager` — VL is the _single, exclusive_ source of cell positioning and sizing. No FlexRoot, no measurement, no `onResize`. The user's `renderItem` content sizes itself however it wants, but the cell does not adapt; the caller is responsible for accurate `estimatedItemSize` / `overrideItemLayout`. This is the FlashList v1 strict model and has no feedback loops by construction.

### Measured mode (flex ancestor)

When the VL is rendered inside a flex parent (`useIsInFlex() === true`), yoga is already laying out the surrounding tree. In this mode each cell wraps its content in a `FlexRoot`, which:

- gives the user's `renderItem` real flex layout (children can `flexGrow`, `flexDirection`, etc.),
- is **unpinned on both axes** so yoga shrinks-to-fit content (see [Cell rendering](#cell-rendering) for why),
- emits `onResize` whenever its natural main-axis or cross-axis size changes.

The cell forwards the main-axis size to `LayoutManager.reportItemSize(userKey, size)` (drives per-item layout offsets). The cross-axis size is forwarded separately to VL's `maxContentCross` aggregator (a monotonic, reset-on-data-change fallback for `viewportCrossSize` — see [Viewport resolution](#viewport-resolution)).

The crucial discipline is that the cross-axis aggregation is **monotonic** (only grows) and **resets on data identity change** — that's how the prior architecture's three-way feedback loop (cell-cross → `_maxCrossSize` → contentCross → cellCrossSize → cell-cross) is avoided. `LayoutManager` itself never sees cross-axis cell reports.

### What stays the same in both modes

- The cell wrapper is positioned exclusively by VL. It has no flex layout itself.
- Cross-axis size of every cell is `cellCrossSize`, derived from viewport. Cell-reported cross sizes only contribute to `maxContentCross` (a viewport-resolution fallback), never to a per-cell cross dim.
- Measurements are stored by `userKey` (the caller's `keyExtractor` output if provided, else `String(index)`). Recycling preserves measurements; a cell rendering an item it has measured before uses the cached size on first render. Without a `keyExtractor`, measurements don't survive data inserts/removes that shift indices.

**Three responsibilities:**

| File | Responsibility |
| - | - |
| `LayoutManager.ts` | Pure layout math. Given data + sizes + cross-axis size, computes per-item offsets in O(n). |
| `VirtualListCell.tsx` | One `<lng-view>` per visible cell with explicit absolute position and dimensions. Wraps user content in `VLCellKeyContext` + `CellBoundsContext` providers. The renderItem subtree persists across slot recycles — the cell wrapper _and_ its descendants survive userKey changes; nested VLs read the new userKey via `VLCellKeyContext` and run their cellKey-change branch instead of remounting. |
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
- **`keyExtractor?: (item, index) => string`** — produces stable per-item `userKey`s used by `LayoutManager` for measurement keys (so measurements survive recycling and index shifts) and by nested VLs as their `cellKey` for state-persistence cache lookups. Falls back to `String(index)` — measurements still apply within a stable list but don't survive inserts/removes that shift indices.
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

**Main-axis size priority** (in `_resolveSize` order, first match wins):

1. **Data entry is `null` / `undefined`** — size is forced to `0`, cell is not rendered. Wins over everything else, including a stale measurement under the same key.
2. **Measured size** _(populated only in measured mode)_ — `_measuredSizes.get(userKey)`. The cell reports under `keyExtractor(item, index)` if provided, else `String(index)`; lookup uses the same key so measurements always apply when the cell has reported.
3. **`overrideItemLayout` returns `layout.size`**.
4. **First-measured size** _(populated only in measured mode)_ — once any cell has reported a non-zero measurement, that first value is used as the fallback for _unmeasured_ cells in place of `estimatedItemSize`. Locked on first; later measurements update individual cells via the per-key path but do not change the implicit fallback.
5. **Fallback: `estimatedItemSize`** — used before any cell has measured (and always in pinned mode, where no measurements happen).

The first-measured fallback is what makes `estimatedItemSize` matter less in measured mode: a slightly-off estimate produces visible reflow only on the very first cell. After that, the second and subsequent cells use the first cell's actual rendered size as their starting point — usually a much closer match to the real content size, so each cell's per-key measurement update moves things only a few pixels (or not at all). Locking on the _first_ measurement (rather than tracking a running average or the most recent) is deliberate: a moving estimate would cascade-rerender every later unmeasured item every time someone new measured, defeating the goal.

In **pinned mode** (no flex ancestor), step 2 never populates: cells never report sizes, so the chain effectively skips to step 3/4/5. Every cell is exactly the size LayoutManager dictated. Get your `estimatedItemSize` / `overrideItemLayout` right or you'll see gaps/overflow.

In **measured mode** (flex ancestor), measurement wins over override because real rendered size is authoritative — if the user's content renders to 250px and the override said 200px, going with 250 prevents overflow into the next item. If the caller wants to _force_ a size and prevent measurement updates, they need to render content sized to that exact dimension (the cell measures whatever content actually renders).

**Cross-axis per-cell size.** `LayoutManager` never sees per-cell cross-axis measurements; every item's `crossSize` is `cellCrossSize × span` (where `cellCrossSize` is derived by VL from `viewportCrossSize`). Cross-axis cell reports flow only into VL's `maxContentCross` aggregator (a viewport-resolution fallback — see [Viewport resolution](#viewport-resolution)). If a user's content overflows the cross-axis, it paints outside the cell wrapper but does not affect `cellCrossSize` for any item.

**First-render behavior** _(measured mode)_. Cells whose `userKey` has never been measured fall through to override → estimate. They render at that estimated main-axis size; once yoga lays them out and `onResize` fires, the cell reports its actual size, LayoutManager updates, and following items reposition. So a list with accurate `estimatedItemSize` (or `overrideItemLayout`) renders correctly from frame 1; lists with bad estimates show a brief reflow on first paint.

**Recycling and measurement.** Measurements are keyed by `userKey`, not index, so a recycled cell reuses its prior measurement immediately. A cell rendering an item it has measured before paints at the right size on first paint — no re-measure needed unless content actually changed.

**Two-layer commit dampening.** Measurement reports go through one of two paths depending on whether a scroll/focus-snap animation is in flight:

1. **Animation batching** (top layer). When `useScrollHandler` fires `onAnimationStart`, VL flips LM into batching mode (`setBatching(true)`). While batched, every report goes into `_batchedSizes` (latest wins per `userKey`) and bypasses the dampening path entirely — the animation is the consumer's clear signal that intermediate yoga measurements aren't worth committing. On `onAnimationEnd`, `setBatching(false)` drains the batch directly into `_measuredSizes` in a single step and bumps `layoutVersion` once. The layout stays frozen for the visible duration of the animation, then settles in one commit when it ends.

2. **Per-key stability dampening** (below the batching layer). Outside of animations, first measurements apply immediately. Subsequent _changes_ to an already-stored measurement go through a `_STABILITY_MS` (currently 120ms) wait: a different value starts a "pending" timer; further reports of the same value advance toward confirmation, and only after the value has been stable for the window does it commit to layout. A different intermediate value restarts the timer. A backstop `setTimeout` is also scheduled per pending entry so values commit even if the cell pushes once and goes quiet (props stable, no further re-renders). This filters transient oscillations from user content that re-measures asynchronously after a scroll has already settled — without the dampener, every spurious yoga measurement propagates to layout offsets and rows below jump on every scroll tick.

The backstop wakes VL through `LayoutManager.setOnChange(cb)` — VL registers a callback at construction that calls `setLayoutVersion(v => v + 1)`. The synchronous-commit paths (immediate first-measurement, stable repeat-after-window) instead return `true` from `reportItemSize` so VL bumps inline. The two paths are mutually exclusive: while `_batching` is true, the dampening map is cleared and pending timers are cancelled (the upcoming flush will replace those values anyway).

**Imperative scroll position is the single source of truth during scroll animations.** When `isScrollAnimating` is true, `contentStyle` deliberately omits `x`/`y` so React reconciliation can't clobber the running `el.node.animate(...)` interpolation. The `stopped` callback in `useScrollHandler` pins the final `node.x`/`node.y` synchronously; the subsequent render with `isScrollAnimating === false` writes the matching declarative value. `committedScrollOffset` is updated unconditionally on every `scrollToOffset` call so the post-animation render's declarative `x`/`y` matches the pinned position even when a hop lands inside the same visible range as the prior commit (e.g. a snap-to-edge from the second item to the first). Without that, the next render would re-apply a stale offset via style and snap content past the interpolated position.

**Measurements persist across data identity changes.** A new `data` array reference (e.g. from a tab switch or a parent re-render that recomputes the array) does not wipe measurements. Cells whose `userKey` survives the change reuse their cached size — items don't shift on re-render. Callers who truly need to invalidate (orientation change, theme swap that materially affects content sizing) can call `layoutManager.clearMeasurements()` imperatively. If user-content's measured size genuinely fluctuates during a session (focus animations, async-loaded content), each reported value updates the layout — that's intentional, since the alternative (locking to max) leaves visible empty space when content is at smaller sizes.

**Skipping cells when `renderItem` returns null.** If `renderItem` returns `null`, the cell renders nothing — no `FocusGroup` wrapper, no separator, no DOM — _and_ the cell calls `LayoutManager.reportItemEmpty(userKey)` via `useLayoutEffect`, which collapses the row to zero main-axis size. Following items close ranks around the gap. This is for callers whose data shape doesn't permit a clean `null` entry but still has logically-empty rows (e.g. `{ id, label, items: [] }` with `items.length === 0` meaning "render nothing").

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

In a horizontal VL nested inside a parent section that contains other siblings (a title, a status row, etc.), `parentCellBounds.height` is the _outer cell's_ full height — `title + innerVL + other`. Using that as the inner VL's cross dim sizes the cells to include the chrome height too. Worse, when the outer cell's measurement bounces (as the user's section component re-measures during scroll/focus animations), the inner VL's `cellCrossSize` bounces with it, and cells are sometimes too tall (gap), sometimes too short (overflow). Trusting the cells' own measured cross instead — `maxContentCross` — gives `cellCrossSize` the cards' natural height regardless of what the outer section measures around them. Only when no cell has measured yet do we fall back to parent/measured/estimate.

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
    x,
    y,
    // Both axes pinned by VL — cell wrapper has NO flex of its own.
    w: horizontal ? size : crossSize,
    h: horizontal ? crossSize : size,
  }}
>
  {isInFlex ? (
    /* FlexRoot is unpinned on both axes — yoga shrinks-to-fit content.
       handleResize forwards main-axis to onItemSizeChange (LM per-key
       store) and cross-axis to onContentCrossLayout (VL maxContentCross). */
    <FlexRoot ref={flexRootRef} onResize={handleResize}>
      <VLCellKeyContext.Provider value={userKey}>
        <CellBoundsContext.Provider value={cellBounds}>{renderedItem}</CellBoundsContext.Provider>
      </VLCellKeyContext.Provider>
    </FlexRoot>
  ) : (
    /* plain content — no flex, no measurement */
    <VLCellKeyContext.Provider value={userKey}>
      <CellBoundsContext.Provider value={cellBounds}>{renderedItem}</CellBoundsContext.Provider>
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

When the caller's `renderItem` includes an inner focusable, that inner is added to FocusManager as a child of the cell's group (not the VL's). The inner becomes the leaf-focused element. `handleVLFocus` (the inner VL's `onChildFocused` handler) fires only when focus crosses a cell boundary — `onChildFocused` is dispatched on the IMMEDIATE parent of the focused node, so spatial nav from one cell wrapper to another at the inner-VL level is the trigger. Movement between focusables _within_ a cell stays scoped to the cell's own focus group and doesn't fire the snap-alignment scroll.

**Why FlexRoot is conditional on `isInFlex`.** When the VL has no flex ancestor, no yoga is running in this subtree. Adding a FlexRoot just for measurement would force yoga to spin up — pure overhead with no benefit, since the user's content isn't using flex either. So we skip it; the cell is silent and pinned.

**Why FlexRoot is unpinned on both axes.** Yoga shrinks the FlexRoot to fit content on both axes. The cell forwards both dimensions: main goes into `LayoutManager`'s per-key measurement store; cross feeds VL's `maxContentCross` fallback (used only when no explicit cross source is available). Pinning cross to `cellCrossSize` would create the prior architecture's feedback loop — cell echoes its own pinned size back to VL, which uses that to compute the pin, etc. Leaving both unpinned lets cell content drive sizing without a loop. Tradeoff: flex-percentage layouts on cross axis (e.g. `width: '100%'` inside a horizontal VL's cell) won't work because the parent has no fixed cross dim — callers needing those should set `style.h` (or `.w`) on the VL, which flips the chain into the explicit branch.

**Why measure via `onResize`?** Lightning's universal `NodeResizeObserver` fires `onResize` whenever a node's size changes. The cell reports the main-axis number to `onItemSizeChange` (LayoutManager's per-key store) and the cross-axis number to `onContentCrossLayout` (VL's `maxContentCross` aggregator). Zero/negative reports are filtered before they reach VL — a transient FlexRoot zero during recycle would otherwise pollute the cache.

**Why a one-shot RAF push on `userKey` change.** `NodeResizeObserver` (driving `onResize`) only fires when the FlexRoot's actual size changes. Two scenarios miss measurements when relying on it alone:

1. **Same-size recycle.** A slot reassigns from item N to item M with identical dimensions. FlexRoot's size doesn't change → no observer event → item M's `userKey` never gets a measurement under the new key.
2. **Empty → non-empty transition.** The cell previously rendered null (no FlexRoot at all); now it renders content. There's nothing for the observer to compare against on the new mount.

The fix: a `useLayoutEffect` keyed on `[userKey, isInFlex, isEmpty, horizontal]` that schedules a RAF when the userKey (or its preconditions) changes, reads `flexRootRef.current.node.w/h` after yoga has laid out, and reports those dimensions. RAF defers until post-layout so the values reflect the post-render dimensions. Cleanup cancels the prior frame's RAF. `onItemSizeChange` / `onContentCrossLayout` are intentionally omitted from the deps with an `oxlint-disable-next-line` — those callbacks are inline closures defined after `pool.reconcile(...)` in `VirtualList.tsx` (React Compiler's optimization boundary in this function), so they're fresh references on every VL render but capture only stable values. Including them as deps would re-fire the effect on every VL render with no behavior change.

This is intentionally **not** an every-render push. Once a cell has reported its size for a given `userKey`, ongoing size changes flow exclusively through `onResize` (which dedupes by definition). The recently-removed every-render variant was contributing to mid-scroll thrashing — every cell's mainOffset change triggered a re-render, every re-render scheduled a RAF, and every RAF pushed a possibly-transient yoga snapshot back into LM. Scoping to userKey changes plus `onResize` reduces the noise without losing the same-size-recycle path.

**Why imperative `focusManager.setFocusedChild(cellElementRef.current)` on `shouldFocus` false → true.** `useFocus` claims focus through the focus manager only at `addElement` time (mount). On a persisting cell whose `autoFocus` prop flips from false to true, `setAutoFocus` only updates the property — it does not actively claim focus. Without an alternative trigger, focus restoration after a slot recycle silently fails: the cell now "wants" focus but nothing pulls it.

The cell holds a ref to its outer FocusGroup's element (`cellElementRef`) and a `prevShouldFocusRef` to detect transitions. A `useLayoutEffect` keyed on `[shouldFocus, focusManager]` calls `focusManager.setFocusedChild(cellElementRef.current)` exactly once per false → true transition. **`setFocusedChild` specifically — NOT `focusManager.focus()` and NOT `cellElementRef.current.focus()`.** The recycle-restore path runs while the user is focused on a different row (the inner VL is reconciling new content offscreen), and:

- `focusManager.focus(cell)` walks up setting parent `focusedElement` at every level and runs `_recalculateFocusPath`, which would yank the user's focus across rows.
- `cellElementRef.current.focus()` only flips `_focused` on the Lightning element; the FocusManager's parent `focusedElement` chain still points at whatever sibling slot the prior content left behind, so the next traversal lands on the wrong cell.

`setFocusedChild` updates only the parent's `focusedElement` and triggers `_recalculateFocusPath` — which is a no-op if the parent isn't already in the active focus path (the off-screen restore case), and otherwise moves focus from the old child to the new one. This replaces the prior `<Fragment key={userKey}>` mechanism, which forced the renderItem subtree to remount on every userKey change to re-fire inner `autoFocus` — that approach tore down nested-VL `LayoutManager`/`RecyclerPool` state on every recycle, which is what we now preserve.

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

1. **Compute target index** from `child.getRelativePosition(contentRef)`, then `layoutManager.findIndexAtOffset(offset - itemAreaOffset)`. Child positions inside contentRef are scroll-independent (cells are absolutely positioned inside contentRef; only contentRef's own x/y changes for scroll), so this is safe to do before scrolling.
2. **Run `handleChildFocused(child)`** — that's the snap-alignment scroll inside `useScrollHandler`. It calls `scrollToOffset(target, animated)`, which synchronously sets `scrollOffsetRef.current = clamp(target)` and kicks off the animation. So even though the visual scroll is async, the ref is already updated.
3. **`setFocusedIndex(resolvedIdx)`** + write to cache with `{ scrollOffset: scrollOffsetRef.current, focusedIndex: resolvedIdx, measurements: layoutManager.getMeasurements() }`. Because step 2 already updated `scrollOffsetRef.current`, this captures the _post-alignment_ offset.

The order matters. If you write before step 2, you capture the pre-scroll offset. On restore, `resetScroll` puts the row at that pre-scroll offset, autoFocus fires, `handleChildFocused` runs and scrolls to the _correct_ offset — but the user sees the row land slightly off and then jump. Two visits are needed for the cache to converge. Doing alignment first and writing after is what makes the first visit land cleanly.

### Recycle entry flow

The enclosing cell's `userKey` (received via `VLCellKeyContext`) changes — meaning the parent VL recycled this row into a different item. The VL's React identity persists across this transition (no remount), so the branch fires on the persisting component instance. The branch runs **during render** as a "derived state from props" pattern (setState-during-render), so the current render uses the restored state — no flash of stale scroll/focus.

1. **Detect the change** via `prevCellKey !== cellKey` (state, not a ref — `useState` is the React-Compiler-friendly equivalent of a ref-write-during-render and avoids the bailout that would unmemoize the whole component).
2. **Save outgoing state** to the parent's cache under `prevCellKey`, capturing `committedScrollOffset` (the latest committed scroll for this about-to-leave cellKey — render-phase ref reads of `scrollOffsetRef.current` would also bail React Compiler, and the inner VL hasn't been animating so the committed value matches), `focusedIndex`, and **a snapshot of `LayoutManager.getMeasurements()`**. The measurement snapshot survives the recycle so the row's inner cells don't have to re-measure from estimate when the row becomes visible again — without it, every recycle-back would cascade first-measurement commits through every following item.
3. **Apply incoming config synchronously** via `layoutManager.updateConfig({ data, ..., separatorSize })`. Without this, LM's `_data` would still be the prior content (the `useLayoutEffect` that calls `updateConfig` hasn't fired yet), so `_resolveSize` would derive userKeys from the old data and miss every entry in the about-to-be-restored measurements map. The result would be one frame of estimate-based layout before the effect catches up — visible flicker.
4. **Read incoming state** from the cache under the new `cellKey`.
5. **`resetScroll(incoming.scrollOffset ?? 0)`** — synchronously updates `scrollOffsetRef`, applies the position to contentRef directly, resets the visible-range cache.
6. **`setFocusedIndex(incoming.focusedIndex ?? 0)`** — cells about to render will pick this up as `shouldFocus`. The `?? 0` fallback is load-bearing: the inner FG's `focusedElement` is React-element-stable across recycle (each cell at its slotKey persists the same Lightning element), so it carries stale memory pointing at whichever cell was last focused under the **previous** cellKey. With `focusedIndex=undefined` no cell flips `shouldFocus` false → true, `VirtualListCell`'s `setFocusedChild` layoutEffect never fires, and the next time the user navigates into this row the FG path traversal lands on the stale cell instead of cell 0. Defaulting to 0 makes cell 0 claim `setFocusedChild` on the next layoutEffect, matching the fresh-mount behavior where `addElement` sets cell 0 as the default `focusedElement` (first focusable child added wins).
7. **`layoutManager.setMeasurements(incoming.measurements)`** if the incoming entry has them, else `layoutManager.clearMeasurements()`. `setMeasurements` also clears any in-flight dampening (`_pendingSizes`, `_pendingTimers`) and batched (`_batchedSizes`) state — pending entries from the prior content are no longer relevant under the restored measurement set.
8. **`setSkipNextFocus(true)`** — the next `handleVLFocus` call after the restore should consume this flag and skip the cache write (it's the FocusGroup re-establishing focus on entry; we don't want that overwriting the restored index). We still call `handleChildFocused` so the snap-alignment runs.
9. **`setPrevCellKey(cellKey)`** — completes the derived-state pattern, so the next render's diff compares against the new cellKey.

Because step 3 of the in-list flow captured the post-alignment offset, step 5 here restores to a value that — when focus re-enters and `handleChildFocused` runs — produces a no-op scroll. No animation, no flicker.

### State and invariants

- **State, not refs (post-React-Compiler-1.0 refactor).** `focusedIndex`, `skipNextFocus`, `prevCellKey` are all `useState` in `VirtualList.tsx`. The earlier ref-based version caused render-phase ref reads/writes that bailed React Compiler on the entire `VirtualListInner`, leaving every inline callback and cell prop closure unmemoized — every cell re-rendered on every VL render. `scrollOffsetRef` (inside `useScrollHandler`) is still a ref because it must update synchronously inside `scrollToOffset` so the immediately-following cache write captures the post-alignment offset. The persistence `useEffect` includes `focusedIndex` in its deps; the setState-async-race the prior comment warned about was specific to the ref-based design and doesn't apply to the current state-based one.
- **`shouldFocus` is read at render time.** `<VirtualListCell shouldFocus={focusedIndex === index}>`. On initial cell mount, `FocusGroup`'s `autoFocus={shouldFocus}` triggers `useFocus → addElement` with `autoFocus: true`, which claims focus through the focus manager. On a persisting cell whose `shouldFocus` flips false → true, the imperative `focusManager.setFocusedChild(cellElementRef.current)` in `VirtualListCell`'s layoutEffect is what actually moves focus.
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

| When                                        | Reads what                                                                                                                | Why                                                                                                                                                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handleVLFocus`, after `handleChildFocused` | `scrollOffsetRef.current` (synchronously updated by `scrollToOffset`) + `resolvedIdx` + `layoutManager.getMeasurements()` | Captures every focus-driven scroll precisely — including sub-range scrolls that don't commit a new visible range.                                                                                                                               |
| `useEffect` on `committedScrollOffset`      | `committedScrollOffset` (state, updated when range changes) + `focusedIndex` (state) + `layoutManager.getMeasurements()`  | Backstop for non-focus scrolls (touch/wheel/imperative `scrollToOffset`). Doesn't fire for sub-range scrolls.                                                                                                                                   |
| Cell-key-change block (during render)       | `committedScrollOffset` + `focusedIndex` + `layoutManager.getMeasurements()`                                              | Saves outgoing state right before restoring incoming. Reads state (not refs) because render-phase ref reads bail React Compiler; the inner VL hasn't been animating, so committed values match `scrollOffsetRef.current` for our purposes here. |

The focus-event write must run _after_ `handleChildFocused` so that `scrollOffsetRef.current` reflects the snap-aligned offset, not the pre-scroll one. See [Focus restoration → In-list navigation flow](#in-list-navigation-flow) for the full rationale.

The cell-key-change block runs as derived state (set during render via `setFocusedIndex` / `setSkipNextFocus` / `setPrevCellKey`), not in an effect, so the current render uses the new state — avoids a flash of stale scroll/focus.

**Initial mount restoration.** When VL initializes its `LayoutManager`, it checks `parentStateCache.get(cellKey)` for an `initialRestoredState` and, if `measurements` is present, calls `layoutManager.setMeasurements(restored)` immediately — before the first cell render. The cell wrappers in this render get layout offsets computed against the restored measurements, so a recycled-into-existence VL paints at the right sizes from frame 1. Without this, the first frame would use estimates and then reflow once measurements re-pushed.

`getMeasurements()` returns a copy (so the cache snapshot doesn't alias the live LM state). `setMeasurements(snapshot)` replaces `_measuredSizes`, clears any pending dampening / batched entries, and marks layout dirty. It deliberately does NOT call `_onChange` because the surrounding code (cell-key-change branch or LM init) is already inside a render that will re-render naturally.

Top-level VLs (no `cellKey`) don't persist anything.

---

## Recycling

`RecyclerPool` reconciles visible indices to React-stable slot keys, grouped by `getItemType`. Items of the same type reuse each other's React subtrees.
**Subtree persists on content swap.** The cell's outer `FocusGroup` is React-keyed by slot, so the wrapper persists across recycles. There is **no keyed Fragment** under the wrapper — when `userKey` changes, the renderedItem subtree (and any nested VL inside it) reconciles in place rather than remounting. Nested VLs detect the new `userKey` via `VLCellKeyContext` and run their cellKey-change branch (save outgoing state, apply new config, restore incoming state) on the same component instance. Their `LayoutManager`, `RecyclerPool`, and any other useRef-backed state survives the round-trip.

**Per-index slot stability.** When an index leaves visibility and later comes back, `RecyclerPool` tries to give it back its **previous slot** via `_lastSlotForIndex`, not whichever one happens to be at the top of the LIFO pool. Without this preference, the same item gets a different `slotKey` on round-trip, React unmounts the entire `VirtualListCell`, and any descendant state is destroyed and reconstructed. The reconstruction goes through transient measurement states that ripple up to the parent VL and cause visible thrashing on scroll-back. With the preference, the round-trip is a no-op for the React tree — same `slotKey`, same component instance, same descendant state.

When the preferred slot isn't available — e.g. it's been reassigned to a different item during the absence — `_acquire` falls back to LIFO pop from the type pool. The cell at that slot was previously rendering some other index; React preserves the cell instance, the userKey changes, and the cell's renderedItem reconciles to the new content. State below the cell still persists (because the cell itself does), so the scroll-back to a stale-preferred index is still better than the no-preservation path.

**Pooled-slot mounting hook.** `RecyclerPool.getPooledSlots()` returns `Array<{ slotKey, lastIndex }>` — every slot currently sitting in the available pool, paired with the data index it most recently served (tracked via `_slotToLastIndex`, the reverse of `_lastSlotForIndex`). It exists so a host could render pooled slots in the React tree positioned offscreen and preserve the React subtree at each pooled slot end-to-end across release/reclaim cycles. **Currently `VirtualList.tsx` does NOT use it** — only `visibleIndices` are rendered, so pooled cells unmount and remount on round-trip; per-index slot stability still gives the same `slotKey` back when the index returns, but any state below the cell wrapper that didn't survive the unmount is gone. The `pooled` prop on `VirtualListCell` and `getPooledSlots` are reserved infrastructure for a future opt-in mode where the host renders pooled cells offscreen with `pooled={true}` to disable their outer `FocusGroup` and skip them in spatial navigation.

If you don't pass `getItemType`, all cells share one pool — fine for uniform lists.

---

## What's not supported

By design, this VL **does not**:

- Aggregate cross-axis cell reports into per-cell cross sizes. Every cell's `crossSize` is `cellCrossSize` (× span); `LayoutManager` never sees cross-axis cell reports. Cell-cross _does_ feed `maxContentCross` (a viewport-resolution fallback) — see the next bullet.
- Let cell-cross reports drive a feedback loop. The `maxContentCross` aggregation is **monotonic** (only grows) and **resets on `data` / `extraData` identity change** so a cell that uses `cellCrossSize` for its own dimensions can't push `cellCrossSize` larger on subsequent reports.
- Offer per-cell cross-axis overrides. `overrideItemLayout.size` is main-axis only; `span` is the only multi-column knob.
- Compute a "running average" of measured main-axis sizes. Each measurement is stored verbatim per `userKey`. The first non-zero measurement seeds an _implicit estimate_ for unmeasured items but is locked on first; later measurements update individual cells via the per-key path only.

If you find yourself letting cell reports drive viewport _bidirectionally_ (i.e. without the monotonic+reset discipline), stop and reread [Why LayoutManager only sees main-axis measurements](#why-layoutmanager-only-sees-main-axis-measurements).

---

## Why LayoutManager only sees main-axis measurements

The pre-rewrite VL fed cross-axis cell reports back into `LayoutManager`. That spawned three coupled measurement systems:

1. **Cell-level** (`FlexRoot` + `NodeResizeObserver`) — each cell's content was observed via yoga and reported on both axes to LayoutManager.
2. **Viewport-level** (`FocusGroup.onResize` → `measuredSize`) — VL watched its own container size for `viewportCrossSize`.
3. **Content-derived cross-size** (`_maxCrossSize` → `contentCross` → `finalCross` → `cellCrossSize`) — VL aggregated cell-reported cross sizes _without monotonicity or per-dataset reset_ back into its own sizing decisions.

The three formed loops: cells report cross → LayoutManager aggregates → VL sets contentRef.h → FocusGroup measures → viewportCrossSize updates → cellCrossSize re-derived → cells re-render at new cross size → cells report different cross size. Symptoms: backward-scroll jank, recycle flickers, sizes "stuck" at initial estimate.

The current design keeps `LayoutManager` pure on the cross axis — cells don't report cross to LM, LM doesn't aggregate it, every cell's `crossSize` is `cellCrossSize` from VL's viewport math. Cross is still reported (via `onContentCrossLayout`) but only to VL's `maxContentCross` aggregator, which is **monotonic** and **resets on data identity change**. A cell that sizes itself off `cellCrossSize` can't push `cellCrossSize` larger on subsequent reports because the max only ever grows for the current dataset, and it starts fresh when the dataset changes. That's what breaks the loop.

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

- **`estimatedItemSize` is critical in pinned mode** (no flex ancestor) — it IS the size for items without an override. In measured mode, a bad estimate only affects items rendered _before the very first cell measures_; once any cell reports its size, that becomes the implicit fallback for the rest of the unmeasured items.
- **`overrideItemLayout` is hot.** It's called for every item on every layout. Don't allocate or do expensive work inside.
- **`keyExtractor` matters.** Measurements are keyed by it. Without one, indices are used (`String(index)`) — which means measurements don't survive data inserts/removes that shift indices. For dynamic lists, supply a stable `keyExtractor`.
- **The cell's main-axis is whatever yoga lays out.** If your `renderItem` returns content with explicit dimensions matching your `estimatedItemSize`/`overrideItemLayout`, the cell measures to that. If they disagree, measurement wins on subsequent renders.
- **The cell's cross-axis is fixed at `cellCrossSize`.** Content overflowing the cross axis paints outside the cell wrapper. Either fit content to `cellCrossSize` or pick a larger viewport / smaller `numColumns`.
- **Top-level VLs should set `style.w/h` explicitly** when known. Self-measurement via `FocusGroup.onResize` works but adds a render cycle.
- **Nested VLs without `style.h` (or `style.w`) inherit from `parentCellBounds`.** That's the cell wrapper's current size — which after measurement is the cell's _content_ size (estimate before, measured after). For a horizontal inner VL inside a row, it's usually cleaner to set `style.h` on the inner VL to its actual item height rather than rely on the parent cell sizing.
- **`focusedIndex` is `useState`, read at cell render time.** Mount-time autoFocus chains through `FocusGroup → useFocus → addElement` to claim focus on first paint. For a persisting cell whose `shouldFocus` flips false → true (slot recycle to content that should be focused), the imperative `focusManager.setFocusedChild(cellElementRef.current)` in `VirtualListCell`'s layoutEffect is what actually moves focus.
- **The cellKey-restore path uses `setFocusedIndex(... ?? 0)`, never undefined.** The inner FG's `focusedElement` is element-stable across recycle and carries stale memory. Defaulting to 0 makes cell 0 trigger `setFocusedChild` on the next layoutEffect; with `undefined` no cell flips false→true and the next focus traversal lands on a stale cell.
- **In `handleVLFocus`, run `handleChildFocused` BEFORE writing to the cache.** `scrollToOffset` synchronously updates `scrollOffsetRef.current` to the snap-aligned target, so the subsequent cache write captures the post-alignment offset. Inverting this order forces a two-visit convergence on restore — the row lands at the wrong offset and only fixes itself on a second focus event.
- **The `useLayoutEffect` RAF size-push in `VirtualListCell` is keyed on `[userKey, isInFlex, isEmpty, horizontal]`** with `onItemSizeChange`/`onContentCrossLayout` intentionally omitted (they're VL-side closures fresh on every render but capturing only stable values; including them re-fires the effect every VL render with no behavior change). Don't widen to `[]` (every-render): that contributed to mid-scroll thrashing. Don't narrow further than `userKey`: same-size recycles need at least the userKey transition to push the new key's measurement.
- **Cell wrappers are `FocusGroup`s; don't downgrade them to `useFocus` or to plain views.** Per-cell focus groups give every cell a baseline focus target, contain spatial nav for multi-focusable cells, and provide the ref target for `setFocusedChild` on `shouldFocus` transitions.
- **Don't re-introduce a keyed `<Fragment key={userKey}>` around `renderedItem`.** The previous version did exactly that to make `useFocus.autoFocus` re-fire on recycle, but it tore down the entire renderItem subtree (including any nested VLs and their `LayoutManager`/`RecyclerPool` state) on every content swap. The current architecture relies on subtree persistence + nested-VL cellKey-change handling to preserve state. Replacing the Fragment with imperative `setFocusedChild` is what enables that.
- **Don't call `setMeasurements` outside the cellKey-change branch or LM init.** It clears all in-flight dampening / batching state, which is correct as a "we're switching content, throw away pending observations" reset but would be a bug if called mid-flight on stable content.
- **Don't re-apply `contentStyle.x/y` while `isScrollAnimating` is true.** The imperative `node.animate()` is the source of truth for position during the animation; re-applying the target via React style on a mid-animation re-render snaps the content past the interpolated value.
- **Reject zero-size measurements.** A cell briefly measuring 0 (mid-recycle, content unmount) must not pollute the cache. `LayoutManager.reportItemSize` rejects `size <= 0`. Genuinely-empty rows go through `reportItemEmpty` instead.
- **Don't feed cross-axis cell reports into `LayoutManager`.** Cross stays at `cellCrossSize` per cell. Cross-axis cell reports are allowed only into `maxContentCross` (a monotonic, reset-on-data-change viewport-resolution fallback). Anything else re-introduces the prior architecture's feedback loop.
- **Don't use `cellElementRef.current.focus()` or `focusManager.focus(cell)` for the recycle-restore claim.** `setFocusedChild` is the only correct API: `.focus()` flips `_focused` without updating the parent's `focusedElement` chain (next traversal lands on a stale sibling); `focusManager.focus()` walks up and runs `_recalculateFocusPath` aggressively, yanking the user's focus across rows.

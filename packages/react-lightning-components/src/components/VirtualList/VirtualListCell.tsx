import type { ComponentType, ReactElement } from 'react';
import { memo, useLayoutEffect, useRef } from 'react';

import type { LightningElement, LightningViewElementStyle } from '@plextv/react-lightning';
import { FocusGroup, useFocusManager } from '@plextv/react-lightning';
import { FlexRoot } from '@plextv/react-lightning-plugin-flexbox';

import { CellBoundsContext, VLCellKeyContext } from './VirtualListContext';
import type { VirtualListRenderItemInfo } from './VirtualListTypes';

export interface VirtualListCellProps<T> {
  /** Main-axis position of the cell within the content container. */
  mainOffset: number;
  /** Cross-axis position of the cell within the content container. */
  crossOffset: number;
  /**
   * Main-axis size dictated by LayoutManager (estimate / override / last
   * measurement). The cell wrapper is pinned to this exactly — VL is the
   * single source of cell positioning. Measurement happens on the inner
   * FlexRoot, not on this element.
   */
  size: number;
  /** Cross-axis size of the cell (from LayoutManager, viewport-driven). */
  crossSize: number;
  renderItem: (info: VirtualListRenderItemInfo<T>) => ReactElement;
  item: T;
  index: number;
  /**
   * Content-identity key from VL's keyExtractor. Two roles:
   * 1. Stable identity for measurement: passed to onItemSizeChange so
   *    LayoutManager keys measurements by userKey, not index.
   * 2. Provided to descendants via VLCellKeyContext for nested-VL state
   *    persistence — when this cell's slot recycles to different content,
   *    the nested VL's `cellKey` context value flips, which fires its
   *    cellKey-change branch (save old measurements/scroll/focus, restore
   *    incoming) so the nested VL component instance survives the recycle.
   */
  userKey: string;
  /**
   * Forwarded to renderItem's info as `shouldFocus`. True when this cell's
   * item should auto-focus on mount (focus restoration after a recycle).
   */
  shouldFocus: boolean;
  extraData?: unknown;
  horizontal: boolean;
  isLastItem: boolean;
  ItemSeparatorComponent?: ComponentType | null;
  /**
   * True when the VL has a flex ancestor — yoga is already running in
   * this subtree. The cell wraps content in a FlexRoot so the user's
   * content can use flex layout AND so the cell can measure its rendered
   * main-axis size and report it. When false, no flex is involved at all
   * — cells are fully pinned and the caller is responsible for accurate
   * `estimatedItemSize` / `overrideItemLayout` (FlashList v1 strict mode).
   */
  isInFlex: boolean;
  /**
   * Called whenever the inner FlexRoot reports a new main-axis size for
   * this cell. Only fired in flex mode — see `isInFlex`. The handler
   * always receives a positive main-axis number; zero/negative reports
   * are filtered out here.
   */
  onItemSizeChange?: (userKey: string, size: number) => void;
  /**
   * Called when `renderItem` returns null. The VL marks the row as
   * logically empty so layout collapses it to zero main-axis size.
   * Distinct from `onItemSizeChange(userKey, 0)` (which is rejected) —
   * this is the explicit "no content" path.
   */
  onItemEmpty?: (userKey: string) => void;
  /**
   * Called whenever this cell's content reports a cross-axis size (flex
   * mode only). VL keeps a single max across all reporters as a fallback
   * cross size when no explicit `style.h` (or `.w` for vertical) and no
   * `parentCellBounds` are available. Same dedupe approach as
   * `onSeparatorLayout`.
   */
  onContentCrossLayout?: (size: number) => void;
  /**
   * Called when this cell's separator first measures (flex mode only).
   * VL is expected to dedupe — every cell that has a separator reports
   * its size, but they're all the same component so VL only acts on the
   * first non-zero value (or genuine changes thereafter). Cross-axis is
   * ignored; only the main-axis dimension is reported.
   */
  onSeparatorLayout?: (size: number) => void;
  /**
   * True when this cell is currently being held in the recycler pool —
   * i.e. it's mounted (so its React subtree and any nested recycler
   * pools survive) but rendered offscreen and excluded from focus
   * traversal. The cell's outer FocusGroup is disabled so spatial
   * navigation skips both the cell and its descendants.
   */
  pooled?: boolean;
}

const VirtualListCellInner = <T,>({
  mainOffset,
  crossOffset,
  size,
  crossSize,
  renderItem,
  item,
  index,
  userKey,
  shouldFocus,
  extraData,
  horizontal,
  isLastItem,
  ItemSeparatorComponent,
  isInFlex,
  onItemSizeChange,
  onItemEmpty,
  onContentCrossLayout,
  onSeparatorLayout,
  pooled = false,
}: VirtualListCellProps<T>): ReactElement | null => {
  // Cell wrapper is positioned and sized by VL exclusively. It uses
  // absolute positioning with explicit width AND height — no flex on this
  // element. VL is the single source of where and how big a cell is.
  const cellStyle: LightningViewElementStyle = {
    position: 'absolute',
    x: horizontal ? mainOffset : crossOffset,
    y: horizontal ? crossOffset : mainOffset,
    w: horizontal ? size : crossSize,
    h: horizontal ? crossSize : size,
  };

  const cellBounds = {
    width: horizontal ? size : crossSize,
    height: horizontal ? crossSize : size,
  };

  const flexRootRef = useRef<LightningElement>(null);
  // The cell's outer FocusGroup element. We need a ref to it so we can
  // imperatively claim focus when `shouldFocus` flips false → true on an
  // already-mounted cell — `useFocus.setAutoFocus` only updates the
  // property, it doesn't actively claim focus. Without this, focus
  // restoration on slot recycle would silently fail.
  const cellElementRef = useRef<LightningElement>(null);
  const prevShouldFocusRef = useRef(shouldFocus);
  const focusManager = useFocusManager();

  const renderedItem = renderItem({ item, index, extraData, shouldFocus });
  const isEmpty = renderedItem == null;

  // Imperative focus-tree update on shouldFocus transition. Only fires
  // on a false → true flip for an existing cell — fresh mounts are
  // handled by FocusGroup's autoFocus via useFocus → addElement.
  //
  // Why `setFocusedChild` and not `focus()` (either on the element or via
  // FocusManager): when a parent VL recycles its slot back to this row's
  // userKey, the inner VL hits its cellKey-change branch and restores
  // `focusedIndex = N` from the cache. That happens during the parent's
  // re-render, BEFORE the user has actually navigated to this row — at
  // that moment the user is still focused on whichever row they pressed
  // up from. `focusManager.focus(cellN)` walks up setting parent
  // focusedElement at every level and runs _recalculateFocusPath, which
  // would yank the user's focus across rows. We only want to record
  // "when focus next traverses into this inner VL, land on cellN" — i.e.
  // update the parent's focusedElement and let _recalculateFocusPath
  // decide whether the current path actually intersects (it doesn't, in
  // the off-screen restore case, so nothing visible changes).
  //
  // Calling `cellElementRef.current.focus()` directly is also wrong: it
  // only flips `_focused` on the Lightning element and the manager's
  // focusedElement chain stays pointing at whatever sibling slot the
  // intermediate row's session left behind, so the next traversal lands
  // on the wrong cell.
  useLayoutEffect(() => {
    if (shouldFocus && !prevShouldFocusRef.current && cellElementRef.current) {
      focusManager.setFocusedChild(cellElementRef.current);
    }

    prevShouldFocusRef.current = shouldFocus;
  }, [shouldFocus, focusManager]);

  const handleResize = (event: { w: number; h: number }) => {
    const main = horizontal ? event.w : event.h;
    const cross = horizontal ? event.h : event.w;

    if (main > 0) {
      onItemSizeChange?.(userKey, main);
    }

    if (cross > 0) {
      onContentCrossLayout?.(cross);
    }
  };

  // If `renderItem` returns null, signal LM to collapse this row to zero
  // main-axis size. Otherwise the row would still occupy `firstMeasured`
  // / `estimatedItemSize` worth of space (and following items would be
  // pushed down by a phantom gap). Effect fires after the render commits
  // — order doesn't matter; `reportItemEmpty` is idempotent and dedupes.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- onItemEmpty is intentionally
  // omitted: it captures only stable values (LayoutManager from useState lazy init, stable
  // setters), so a "stale" closure is functionally identical to a fresh one. Including it
  // in deps would force the effect to re-fire on every VL render because React Compiler
  // doesn't memoize VL's cell handlers (they live after pool.reconcile, the compiler's
  // optimization boundary in VirtualListInner).
  useLayoutEffect(() => {
    if (isEmpty && onItemEmpty) {
      onItemEmpty(userKey);
    }
  }, [isEmpty, userKey]);

  // One-shot push on mount and on `userKey` change (slot recycle). All
  // ongoing size changes after that flow through `handleResize` →
  // `onResize` (NodeResizeObserver). We need this hook because
  // NodeResizeObserver only fires when the FlexRoot's own dimensions
  // change — when a slot recycles to new content that happens to lay out
  // at the same size as the previous occupant, the observer is silent
  // but LM still needs the per-key measurement under the new userKey.
  // RAF defers until after yoga's layout pass so node.w/h reflect the
  // post-render dimensions.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- onItemSizeChange / onContentCrossLayout
  // are intentionally omitted: VL's compiler-generated output (current React Compiler 1.0)
  // doesn't memoize cell handlers because they live after pool.reconcile (an apparent
  // optimization boundary). Their closures only capture stable values (LayoutManager from
  // useState lazy init, stable setters), so a "stale" reference is functionally equivalent
  // to a fresh one. Including them in deps would re-fire this effect on every VL render
  // and re-push every cell's measurement uselessly.
  useLayoutEffect(() => {
    if (!isInFlex || !onItemSizeChange || isEmpty) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      const node = flexRootRef.current?.node;

      if (!node) {
        return;
      }

      const main = horizontal ? node.w : node.h;
      const cross = horizontal ? node.h : node.w;

      if (main > 0) {
        onItemSizeChange(userKey, main);
      }

      if (cross > 0) {
        onContentCrossLayout?.(cross);
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [userKey, isInFlex, isEmpty, horizontal]);

  const separatorPosition: { x: number } | { y: number } = horizontal
    ? { x: size }
    : { y: size };

  // Return null AFTER the hooks so we don't paint an empty cell wrapper.
  // The empty-row effect above signals LM via `onItemEmpty` so the row
  // collapses to zero main-axis size in layout.
  if (isEmpty) {
    return null;
  }

  const innerContent = (
    <VLCellKeyContext.Provider value={userKey}>
      <CellBoundsContext.Provider value={cellBounds}>{renderedItem}</CellBoundsContext.Provider>
    </VLCellKeyContext.Provider>
  );

  // Two paths:
  //
  // - In flex (`isInFlex`): yoga is already running in this subtree, so
  //   we wrap content in a FlexRoot. The FlexRoot has NO width/height
  //   pinning — yoga sizes it to fit content on both axes. The cell
  //   reports both axes back to VL via `handleResize`: main-axis goes
  //   into LayoutManager's per-key measurement store, cross-axis goes
  //   into VL's max-content-cross fallback. Leaving the cross axis
  //   unpinned is what lets VL size to content when no explicit cross
  //   source is available — pinning it would create the feedback loop
  //   the prior architecture had (cell reports its own pinned size back
  //   to VL, which uses that to compute the pin, etc.).
  //
  //   Tradeoff: flex content using cross-axis percentages (e.g.
  //   `width: '100%'` inside a vertical VL's cell) won't work, because
  //   the FlexRoot has no fixed cross dim to compute the percentage
  //   against. Callers needing those layouts should set `style.h` (or
  //   `.w`) on the VL — that flips the chain into the explicit branch
  //   and `crossSize` becomes a real number the renderItem can target.
  //
  // - Not in flex: there is no yoga in this subtree. Adding a FlexRoot
  //   would force one to spin up just for measurement, which has cost
  //   and no benefit (the user's renderItem isn't using flex anyway).
  //   We render content plainly. No measurement is reported; the cell
  //   stays at exactly the size LayoutManager dictated, so the caller
  //   is responsible for accurate `estimatedItemSize` /
  //   `overrideItemLayout`.
  const measuredContent = isInFlex ? (
    <FlexRoot ref={flexRootRef} onResize={handleResize}>
      {innerContent}
    </FlexRoot>
  ) : (
    innerContent
  );

  const handleSeparatorResize = (event: { w: number; h: number }) => {
    const measured = horizontal ? event.w : event.h;

    if (measured > 0) {
      onSeparatorLayout?.(measured);
    }
  };

  // Separator: in flex mode, wrap in a FlexRoot so yoga measures it and
  // we can report the size up to VL. VL dedupes — every cell reports the
  // same size, but VL only acts on changes. In pinned mode there's no
  // measurement, so the separator just renders at its own intrinsic size
  // (which the caller is responsible for setting via explicit dims), and
  // VL keeps `separatorSize` at whatever the caller passed in (default 0).
  let separatorEl: ReactElement | null = null;

  if (ItemSeparatorComponent && !isLastItem) {
    const SeparatorComponent = ItemSeparatorComponent;
    const separatorContent = isInFlex ? (
      <FlexRoot onResize={handleSeparatorResize}>
        <SeparatorComponent />
      </FlexRoot>
    ) : (
      <SeparatorComponent />
    );

    separatorEl = (
      <lng-view style={{ position: 'absolute', ...separatorPosition }}>
        {separatorContent}
      </lng-view>
    );
  }

  // Each cell is its own FocusGroup. Spatial navigation within a cell
  // (e.g., a row with multiple buttons) stays inside the cell until
  // there's no candidate, then bubbles up to the VL's outer FocusGroup
  // for cross-cell movement. autoFocus={shouldFocus} restores focus on
  // initial mount; the imperative `cellElementRef.current.focus()` in
  // the layoutEffect above handles subsequent recycle-time transitions.
  return (
    <FocusGroup
      ref={cellElementRef}
      style={cellStyle}
      autoFocus={shouldFocus}
      disable={pooled}
    >
      {measuredContent}
      {separatorEl}
    </FocusGroup>
  );
};

function areCellPropsEqual(
  prev: VirtualListCellProps<unknown>,
  next: VirtualListCellProps<unknown>,
): boolean {
  // The four `on*` callbacks below are intentionally skipped in this
  // comparison. React Compiler doesn't memoize them inside VirtualList
  // (they're inline closures defined after `pool.reconcile(...)`, which
  // appears to be the compiler's optimization boundary in this function),
  // so they're fresh references on every VL render. But each captures
  // only stable values — `layoutManager` from a lazy `useState` (set
  // once), the stable setState setters, and refs accessed inside the
  // closure body. A "stale" callback from a prior render is functionally
  // identical to a fresh one, so we don't need to bust memoization on
  // identity. Comparing them would force every visible cell to re-render
  // on every VL render, defeating the whole point of `memo`.
  return (
    prev.mainOffset === next.mainOffset &&
    prev.crossOffset === next.crossOffset &&
    prev.size === next.size &&
    prev.crossSize === next.crossSize &&
    prev.renderItem === next.renderItem &&
    prev.item === next.item &&
    prev.index === next.index &&
    prev.userKey === next.userKey &&
    prev.shouldFocus === next.shouldFocus &&
    prev.extraData === next.extraData &&
    prev.horizontal === next.horizontal &&
    prev.isLastItem === next.isLastItem &&
    prev.ItemSeparatorComponent === next.ItemSeparatorComponent &&
    prev.isInFlex === next.isInFlex &&
    prev.pooled === next.pooled
  );
}

export const VirtualListCell = memo(VirtualListCellInner, areCellPropsEqual) as (<T>(
  props: VirtualListCellProps<T>,
) => ReactElement | null) & { displayName?: string };

VirtualListCell.displayName = 'VirtualListCell';

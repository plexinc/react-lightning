import type { ComponentType, Ref } from "react";
import {
  type ForwardedRef,
  forwardRef,
  isValidElement,
  type ReactElement,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  FocusGroup,
  type LightningElement,
  type LightningViewElementStyle,
} from "@plextv/react-lightning";
import {
  FlexBoundary,
  useIsInFlex,
} from "@plextv/react-lightning-plugin-flexbox";

import { LayoutManager } from "./LayoutManager";
import { parseContentStyle } from "./parseContentStyle";
import { RecyclerPool } from "./RecyclerPool";
import { useScrollHandler } from "./useScrollHandler";
import { useViewability } from "./useViewability";
import { VirtualListCell } from "./VirtualListCell";
import {
  CellBoundsContext,
  type VLPersistedState,
  VLCellKeyContext,
  VLStateCacheContext,
} from "./VirtualListContext";
import type { VirtualListProps, VirtualListRef } from "./VirtualListTypes";

function renderListComponent(
  component: VirtualListProps<unknown>["ListHeaderComponent"],
): ReactElement | null {
  if (!component) {
    return null;
  }

  if (isValidElement(component)) {
    return component;
  }

  const Component = component as ComponentType;

  return <Component />;
}

function VirtualListInner<T>(
  props: VirtualListProps<T>,
  ref: ForwardedRef<VirtualListRef>,
) {
  const {
    data,
    renderItem,
    estimatedItemSize = 200,
    horizontal = false,
    numColumns = 1,
    drawDistance = 250,
    keyExtractor,
    extraData,
    contentContainerStyle,
    style,
    ListHeaderComponent,
    listHeaderSize = 0,
    ListFooterComponent,
    listFooterSize = 0,
    ListEmptyComponent,
    ItemSeparatorComponent,
    overrideItemLayout,
    getItemType,
    initialScrollIndex,
    initialScrollIndexParams,
    onEndReached,
    onEndReachedThreshold = 0.5,
    onScroll,
    onViewableItemsChanged,
    viewabilityConfig,
    onLoad,
    onLayout,
    snapToAlignment = "start",
    animationDuration = 300,
    autoFocus,
    trapFocusUp,
    trapFocusRight,
    trapFocusDown,
    trapFocusLeft,
  } = props;

  const parentCellBounds = useContext(CellBoundsContext);
  // True when this VL is rendered inside a flex parent. Determines whether
  // cells get a FlexRoot wrapper (which both supports flex content and
  // measures content size). When false, cells are pinned and silent.
  const isInFlex = useIsInFlex();

  // State persistence across cell recycles. The enclosing cell of a parent
  // VL provides our identity (cellKey) and the parent VL provides a cache;
  // when cellKey changes (recycle into a different row), we save the old
  // row's state to the cache and restore the new row's. Top-level VLs (no
  // parent VL) skip this entirely.
  const cellKey = useContext(VLCellKeyContext);
  const parentStateCache = useContext(VLStateCacheContext);
  const initialRestoredState =
    cellKey != null && parentStateCache
      ? parentStateCache.get(cellKey)
      : undefined;
  const initialScrollOffset = initialRestoredState?.scrollOffset ?? 0;
  // Focus tracking is state (not a ref) so React Compiler can memoize
  // the rest of VirtualListInner — render-phase ref reads (e.g.
  // `shouldFocus={focusedIndex === index}` in cells.map) cause the
  // compiler to bail on the entire function, which then leaves every
  // inline callback and JSX value unmemoized. Cells re-render on every
  // VL render because their `areCellPropsEqual` compares fresh closures.
  // setState during render (the cellKey-change branch) is the
  // React-canonical "derived state from props" pattern.
  const [focusedIndex, setFocusedIndex] = useState<number | undefined>(
    initialRestoredState?.focusedIndex,
  );
  // After a cellKey change we restore the saved focused index. The
  // FocusGroup may auto-pick its first focusable on entry, which fires
  // onChildFocused and would otherwise overwrite the restored index.
  // Skip exactly one onChildFocused after a cellKey change.
  const [skipNextFocus, setSkipNextFocus] = useState(false);

  // State cache provided to nested VLs inside our cells. Lazy-init via
  // useState so the Map's identity is stable without a render-phase
  // ref-write pattern.
  const [ownStateCache] = useState<Map<string, VLPersistedState>>(
    () => new Map(),
  );

  const [measuredSize, setMeasuredSize] = useState({ w: 0, h: 0 });
  const [, setLayoutVersion] = useState(0);
  // Separator size is measured once (any cell that renders a separator
  // reports its size; we dedupe to a single sticky value). LayoutManager
  // gets it via updateConfig and accounts for it in offsets between cells.
  const [separatorSize, setSeparatorSize] = useState(0);
  const separatorSizeRef = useRef(0);
  // Max cross-axis size reported by any cell's content. Used as a
  // fallback when the caller hasn't given us an explicit cross via
  // `style` or `parentCellBounds`. Monotonic by design — once a cell
  // measures cross=N, VL stays at that size or larger. Resets when data
  // identity changes (extraData / data ref) since fresh content can
  // legitimately be smaller than what came before.
  const [maxContentCross, setMaxContentCross] = useState(0);
  const maxContentCrossRef = useRef(0);
  const padding = parseContentStyle(contentContainerStyle);

  const paddingStart = horizontal ? padding.left : padding.top;
  const paddingEnd = horizontal ? padding.right : padding.bottom;
  const paddingCross = horizontal ? padding.top : padding.left;
  const paddingCrossEnd = horizontal ? padding.bottom : padding.right;
  const crossPadding = paddingCross + paddingCrossEnd;
  const headerSize = ListHeaderComponent ? listHeaderSize : 0;
  const footerSize = ListFooterComponent ? listFooterSize : 0;
  const itemAreaOffset = paddingStart + headerSize;

  // Main-axis viewport size (the scroll dimension): explicit style >
  // parent cell bounds > self-measured. We trust measuredSize on the
  // main axis because it represents how much room the parent's flex
  // gave us — orthogonal to anything cell content does.
  const explicitMain = horizontal
    ? (style?.w as number | undefined)
    : (style?.h as number | undefined);
  const parentMain = horizontal
    ? parentCellBounds?.width
    : parentCellBounds?.height;
  const measuredOuterMain = horizontal ? measuredSize.w : measuredSize.h;
  const viewportSize =
    explicitMain ??
    parentMain ??
    (measuredOuterMain > 0 ? measuredOuterMain : 0);

  // Cross-axis viewport size (the bounded dim). Priority order depends on
  // orientation because `measuredOuterCross` means different things in
  // each case:
  //
  // - Vertical VL: outerStyle has `flexGrow: 1`, so the FocusGroup gets
  //   its width from the parent's flex layout. `measuredOuterCross` is
  //   that parent-allocated viewport width — reliable, orthogonal to
  //   anything the cells do. Trust it over content reports.
  //
  // - Horizontal VL: outerStyle has no flex behavior on either axis, so
  //   the FocusGroup's height shrinks to content. `measuredOuterCross`
  //   is itself content-driven (fed by cellCrossSize → contentRef → self
  //   measure) and would create the prior architecture's feedback loop.
  //   In this case use `maxContentCross` (the natural cross dim of the
  //   tallest cell) so the VL grows to fit content on the unbounded axis.
  //
  // Without this asymmetry, vertical VLs end up with `cellCrossSize` set
  // to the natural width of the widest row content (i.e. an inner
  // horizontal scroller's full `totalContentSize` — many thousands of
  // pixels) instead of the viewport width, and every row oscillates
  // around its measured height as inner-VL bounds churn.
  const explicitCross = horizontal
    ? (style?.h as number | undefined)
    : (style?.w as number | undefined);
  const parentCross = horizontal
    ? parentCellBounds?.height
    : parentCellBounds?.width;
  const measuredOuterCross = horizontal ? measuredSize.h : measuredSize.w;

  let viewportCrossSize: number;

  // Vertical VLs: parent and measured cross are reliable — for a vertical
  // VL nested inside a column-flex parent, both report the full allocated
  // column width, which is exactly what cells should fill. Cell-content
  // cross sizes (per-row natural widths) are typically larger than the
  // viewport in app rows that wrap inner horizontal scrollers; using them
  // would set cellCross to the scroller's full content width. Skip.
  //
  // Horizontal VLs: parent and measured cross are NOT reliable — for a
  // horizontal VL nested inside a parent section that contains other
  // siblings (a title, etc.), the outer cell's measured height is
  // title+innerVL+other, and `parentCellBounds.height` propagates that
  // total down. The inner VL's cards only need their own height, not the
  // section's. So for horizontal we prefer content-driven cellCross when
  // available and only fall back to parent/measured/estimate when no
  // content has been measured yet.
  if (explicitCross != null && explicitCross > 0) {
    viewportCrossSize = explicitCross;
  } else if (!horizontal && parentCross != null && parentCross > 0) {
    viewportCrossSize = parentCross;
  } else if (!horizontal && measuredOuterCross > 0) {
    viewportCrossSize = measuredOuterCross;
  } else if (maxContentCross > 0) {
    viewportCrossSize = maxContentCross + crossPadding;
  } else if (parentCross != null && parentCross > 0) {
    viewportCrossSize = parentCross;
  } else if (measuredOuterCross > 0) {
    viewportCrossSize = measuredOuterCross;
  } else {
    viewportCrossSize = estimatedItemSize;
  }

  const cellCrossSize = (viewportCrossSize - crossPadding) / numColumns;

  // Lazy-init the LayoutManager via useState — the previous
  // `useRef(null) + if (!ref.current) ref.current = new ...` pattern is a
  // render-phase ref read AND write, which causes React Compiler to bail
  // on memoizing `VirtualListInner`. `useState(() => new ...)` does the
  // same thing and is compiler-friendly. Initial-mount-only side effects
  // (measurement restore, onChange wiring) live inside the initializer.
  const [layoutManager] = useState<LayoutManager<T>>(() => {
    const lm = new LayoutManager<T>({
      data,
      estimatedItemSize,
      numColumns,
      overrideItemLayout,
      extraData,
      separatorSize,
      cellCrossSize,
      keyExtractor,
    });

    if (initialRestoredState?.measurements) {
      lm.setMeasurements(initialRestoredState.measurements);
    }

    lm.setOnChange(() => {
      setLayoutVersion((v) => v + 1);
    });

    return lm;
  });

  useLayoutEffect(() => {
    if (
      layoutManager.updateConfig({
        data,
        estimatedItemSize,
        numColumns,
        overrideItemLayout,
        extraData,
        cellCrossSize,
        keyExtractor,
        separatorSize,
      })
    ) {
      setLayoutVersion((v) => v + 1);
    }
  }, [
    data,
    estimatedItemSize,
    numColumns,
    overrideItemLayout,
    extraData,
    cellCrossSize,
    keyExtractor,
    separatorSize,
  ]);

  // Lazy-init via useState for the same reason as `layoutManager`:
  // `useRef(null) + if (!ref.current) ref.current = ...` is a render-phase
  // ref read+write that bails out React Compiler's whole-function
  // memoization.
  const [pool] = useState<RecyclerPool>(
    () => new RecyclerPool(horizontal ? "h" : "v"),
  );
  const getKey = (index: number): string =>
    keyExtractor && data[index] !== undefined
      ? keyExtractor(data[index], index)
      : String(index);
  const getData = (i: number) => data[i];
  const getLayout = (i: number) => layoutManager.getLayout(i);

  const totalContentSize =
    paddingStart +
    headerSize +
    layoutManager.totalSize +
    footerSize +
    paddingEnd;
  // Cross size of the scrollable content area: viewport size when known
  // (so content fills its container); otherwise the cells' computed cross
  // size plus padding.
  const finalCross =
    viewportCrossSize > 0
      ? viewportCrossSize
      : cellCrossSize * numColumns + crossPadding;

  // Two-layer commit dampening:
  //
  // 1. While a scroll/focus-snap animation is running, LM is in batching
  //    mode — reports accumulate per-userKey and only commit on animation
  //    end (skipping the dampening path entirely). This keeps the layout
  //    frozen for the visible duration of the animation.
  //
  // 2. Outside of animations, LM uses per-userKey stability dampening
  //    with a backstop timer. Reports that differ from the stored value
  //    sit pending until either a matching report arrives after the
  //    stability window, or the backstop fires. This absorbs the
  //    multi-frame cascade where a section's measured height keeps
  //    shifting as inner cells/async content settle after the scroll.
  // While true, contentStyle omits x/y so React reconciliation can't
  // clobber the imperative animation in flight. Flipped by the animation
  // start/end hooks; the stopped handler in useScrollHandler pins the
  // final node.x/y, and the subsequent render (false again) writes the
  // matching declarative value.
  const [isScrollAnimating, setIsScrollAnimating] = useState(false);

  const handleAnimationStart = () => {
    layoutManager.setBatching(true);
    setIsScrollAnimating(true);
  };
  const handleAnimationEnd = () => {
    setIsScrollAnimating(false);

    if (layoutManager.setBatching(false)) {
      setLayoutVersion((v) => v + 1);
    }
  };

  // Cell handlers are declared HERE, before `pool.reconcile(...)` further
  // below, because that method-call appears to be React Compiler 1.0's
  // optimization boundary in this function — anything declared after is
  // emitted as a plain inline `const` and isn't memoized. Cells consume
  // these handlers as props and rely on stable identities so their
  // `memo`/`areCellPropsEqual` short-circuit holds across VL renders.
  // Each handler captures only stable values (layoutManager from a lazy
  // `useState`, stable setters, refs accessed inside the closure body),
  // so the compiler-emitted `if ($[i] !== layoutManager) ...` cache check
  // is enough to keep them referentially stable.
  const handleItemSizeChange = (userKey: string, measuredSize: number) => {
    if (layoutManager.reportItemSize(userKey, measuredSize)) {
      setLayoutVersion((v) => v + 1);
    }
  };

  const handleItemEmpty = (userKey: string) => {
    if (layoutManager.reportItemEmpty(userKey)) {
      setLayoutVersion((v) => v + 1);
    }
  };

  const handleSeparatorLayout = (size: number) => {
    if (size > 0 && Math.abs(size - separatorSizeRef.current) >= 1) {
      separatorSizeRef.current = size;
      setSeparatorSize(size);
    }
  };

  const handleContentCrossLayout = (size: number) => {
    if (size > maxContentCrossRef.current) {
      maxContentCrossRef.current = size;
      setMaxContentCross(size);
    }
  };

  const {
    contentRef,
    scrollOffsetRef,
    committedScrollOffset,
    scrollToOffset,
    scrollToIndex,
    scrollToEnd,
    handleChildFocused,
    resetScroll,
  } = useScrollHandler({
    layoutManager: layoutManager as LayoutManager<unknown>,
    horizontal,
    viewportSize,
    drawDistance,
    itemAreaOffset,
    totalContentSize,
    viewportCrossSize,
    totalCrossSize: finalCross,
    animationDuration,
    snapToAlignment,
    onScroll,
    onEndReached,
    onEndReachedThreshold,
    paddingStart,
    paddingEnd,
    initialScrollOffset,
    onAnimationStart: handleAnimationStart,
    onAnimationEnd: handleAnimationEnd,
  });

  // Persist scroll position to the parent's cache when the visible range
  // commits. Focus changes write to the cache directly via handleVLFocus.
  useEffect(() => {
    if (cellKey == null || !parentStateCache) {
      return;
    }

    parentStateCache.set(cellKey, {
      scrollOffset: committedScrollOffset,
      focusedIndex,
      measurements: layoutManager.getMeasurements(),
    });
  }, [
    cellKey,
    committedScrollOffset,
    focusedIndex,
    parentStateCache,
    layoutManager,
  ]);

  // Detect cellKey change: this VL was recycled into a different row.
  // Save the old row's state, restore the new row's state. Done as a
  // derived-state-from-props pattern (setState during render) so the
  // current render uses the new state — avoids a flash of stale
  // scroll/focus. Stored as state (not a ref) so the comparison and
  // setState pair don't trigger React Compiler's render-phase ref bailout.
  const [prevCellKey, setPrevCellKey] = useState(cellKey);

  if (prevCellKey !== cellKey) {
    if (prevCellKey != null && parentStateCache) {
      parentStateCache.set(prevCellKey, {
        // `committedScrollOffset` is the latest committed scroll for this
        // (about-to-leave) cellKey. Reading `scrollOffsetRef.current`
        // here would be a render-phase ref read — bailout territory —
        // and the inner VL hasn't been animating, so the committed value
        // matches `scrollOffsetRef.current` for our purposes.
        scrollOffset: committedScrollOffset,
        focusedIndex,
        measurements: layoutManager.getMeasurements(),
      });
    }

    // Apply the incoming config synchronously so the cells in THIS render
    // lay out against the new content with correctly-keyed measurements.
    // Without this, LM's `_data` would still be the prior content (the
    // useLayoutEffect that calls updateConfig hasn't fired yet), so
    // `_resolveSize` would derive userKeys from the old data and miss
    // every entry in the just-restored measurements map.
    layoutManager.updateConfig({
      data,
      estimatedItemSize,
      numColumns,
      overrideItemLayout,
      extraData,
      cellCrossSize,
      keyExtractor,
      separatorSize,
    });

    const incoming =
      cellKey != null && parentStateCache
        ? parentStateCache.get(cellKey)
        : undefined;

    resetScroll(incoming?.scrollOffset ?? 0);
    // The `?? 0` fallback is load-bearing. The outer FG's `focusedElement`
    // is element-stable across recycle (cells at each slotKey persist), so
    // it points at whichever cell the user last focused under the prior
    // cellKey. With focusedIndex=undefined no cell flips shouldFocus
    // false→true and VirtualListCell's layoutEffect never calls
    // `setFocusedChild` to overwrite that stale entry — the next traversal
    // into this row would land on the stale cell. Defaulting to 0 makes
    // cell 0 claim it, matching fresh-mount behavior where addElement
    // sets the first focusable as `focusedElement`.
    setFocusedIndex(incoming?.focusedIndex ?? 0);

    if (incoming?.measurements) {
      layoutManager.setMeasurements(incoming.measurements);
    } else {
      layoutManager.clearMeasurements();
    }

    setSkipNextFocus(true);
    setPrevCellKey(cellKey);
  }

  // Focus tracking: when a focusable descendant is focused, find which
  // item index it lives in via its position relative to contentRef. Write
  // directly to the parent's cache so the latest focused index survives
  // recycle even when no scroll-driven useEffect runs between focus moves.
  //
  // Order matters: child's position relative to contentRef is independent
  // of scroll (cells are absolutely positioned inside contentRef), so we
  // can compute the target index BEFORE running alignment. Then we run
  // alignment — which synchronously updates scrollOffsetRef.current to
  // the snap target — and finally write to the cache. Writing before
  // alignment would capture the pre-scroll offset, which on restore
  // requires a second focus event to converge (the user sees the row
  // land slightly off, then jump to the right spot).
  const handleVLFocus = (child: LightningElement) => {
    if (skipNextFocus) {
      setSkipNextFocus(false);
      handleChildFocused(child);

      return;
    }

    const el = contentRef.current;
    let resolvedIdx = -1;

    if (el) {
      const pos = child.getRelativePosition(el);
      const offset = horizontal ? pos.x : pos.y;
      const offsetInItemSpace = Math.max(0, offset - itemAreaOffset);

      resolvedIdx = layoutManager.findIndexAtOffset(offsetInItemSpace);
    }

    handleChildFocused(child);

    if (resolvedIdx >= 0) {
      setFocusedIndex(resolvedIdx);

      if (cellKey != null && parentStateCache) {
        parentStateCache.set(cellKey, {
          scrollOffset: scrollOffsetRef.current,
          focusedIndex: resolvedIdx,
          measurements: layoutManager.getMeasurements(),
        });
      }
    }
  };

  const scrollInItemSpace = Math.max(0, committedScrollOffset - itemAreaOffset);
  const visibleRange = layoutManager.getVisibleRange(
    scrollInItemSpace,
    viewportSize,
    drawDistance,
  );
  const visibleIndices: number[] = [];

  if (data.length > 0 && visibleRange.endIndex >= visibleRange.startIndex) {
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      visibleIndices.push(i);
    }
  }

  useViewability({
    viewabilityConfig,
    onViewableItemsChanged,
    getLayout,
    getData,
    getKey,
    visibleIndices,
    scrollOffset: scrollInItemSpace,
    viewportSize,
    horizontal,
  });

  const getType = (index: number): string | number =>
    // oxlint-disable-next-line typescript/no-non-null-assertion -- index is within data bounds
    getItemType?.(data[index]!, index, extraData) ?? 0;

  const slotAssignments = pool.reconcile(visibleIndices, getType);

  useLayoutEffect(() => {
    maxContentCrossRef.current = 0;
    setMaxContentCross(0);
    // Per-key measurements are NOT cleared here on purpose. Tab switches
    // and other re-renders often produce a new `data` array reference
    // even when the underlying items (and their userKeys) haven't
    // changed. Clearing measurements would force every cell to re-measure
    // from estimate, and any render-time variance (focus state, async
    // content) would shift row positions visibly. If a caller truly
    // needs to invalidate measurements, they can call
    // `layoutManager.clearMeasurements()` imperatively.
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- intentional reset on data identity change
  }, [data, extraData]);

  const handleViewportResize = (event: { w: number; h: number }) => {
    setMeasuredSize((prev) =>
      prev.w === event.w && prev.h === event.h ? prev : event,
    );
  };

  useImperativeHandle(ref, () => ({
    scrollToIndex: (params) =>
      scrollToIndex(
        params.index,
        params.animated,
        params.viewPosition,
        params.viewOffset,
      ),
    scrollToOffset: (params) => scrollToOffset(params.offset, params.animated),
    scrollToEnd: (params) => scrollToEnd(params?.animated),
    getScrollOffset: () => scrollOffsetRef.current,
    getVisibleRange: () => visibleRange,
  }));

  const loadTimeRef = useRef(Date.now());
  const hasLoadedRef = useRef(false);
  const prevLayoutRef = useRef({ w: 0, h: 0 });
  const scrollToIndexRef = useRef(scrollToIndex);

  useLayoutEffect(() => {
    scrollToIndexRef.current = scrollToIndex;
  }, [scrollToIndex]);

  // oxlint-disable-next-line react-hooks/exhaustive-deps -- mount-only — scrollToIndex accessed via ref
  useEffect(() => {
    if (initialScrollIndex != null && initialScrollIndex > 0) {
      const viewOffset = initialScrollIndexParams?.viewOffset ?? 0;

      scrollToIndexRef.current(initialScrollIndex, false, 0, viewOffset);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current && data.length > 0) {
      hasLoadedRef.current = true;
      onLoad?.({ elapsedTimeInMs: Date.now() - loadTimeRef.current });
    }
  }, [data.length, onLoad]);

  useEffect(() => {
    if (!onLayout) {
      return;
    }

    const contentW = horizontal ? totalContentSize : viewportCrossSize;
    const contentH = horizontal ? viewportCrossSize : totalContentSize;
    const prev = prevLayoutRef.current;

    if (prev.w !== contentW || prev.h !== contentH) {
      prevLayoutRef.current = { w: contentW, h: contentH };
      onLayout({ w: contentW, h: contentH });
    }
  }, [onLayout, horizontal, totalContentSize, viewportCrossSize]);

  const outerStyle: LightningViewElementStyle = {
    flexGrow: horizontal ? undefined : 1,
    flexShrink: horizontal ? undefined : 1,
    clipping: true,
    boundsMargin: horizontal
      ? [0, drawDistance * 2, 0, drawDistance * 2]
      : [drawDistance * 2, 0, drawDistance * 2, 0],
    ...style,
    ...(padding.backgroundColor != null
      ? { color: padding.backgroundColor }
      : undefined),
  };

  if (data.length === 0 && ListEmptyComponent) {
    return (
      <VLStateCacheContext.Provider value={ownStateCache}>
        <FocusGroup
          style={outerStyle}
          autoFocus={autoFocus}
          trapFocusUp={trapFocusUp}
          trapFocusRight={trapFocusRight}
          trapFocusDown={trapFocusDown}
          trapFocusLeft={trapFocusLeft}
        >
          {renderListComponent(ListEmptyComponent)}
        </FocusGroup>
      </VLStateCacheContext.Provider>
    );
  }

  const scrollPosition = -committedScrollOffset;
  // Skip declarative x/y while a scroll animation is in flight — the
  // imperative `el.node.animate(...)` in useScrollHandler is the source
  // of truth for position during that window. Reapplying the target via
  // contentStyle on a mid-animation re-render (e.g. when the visible
  // range commits) snaps the content past the interpolated value.
  const contentStyle: LightningViewElementStyle = horizontal
    ? {
        w: totalContentSize,
        h: finalCross,
        ...(isScrollAnimating ? null : { x: scrollPosition }),
      }
    : {
        w: finalCross,
        h: totalContentSize,
        ...(isScrollAnimating ? null : { y: scrollPosition }),
      };

  const cells = visibleIndices.map((index) => {
    const item = data[index];

    if (item == null) {
      return null;
    }

    // oxlint-disable-next-line typescript/no-non-null-assertion -- layout exists for all visible indices
    const layout = layoutManager.getLayout(index)!;

    // Skip cells that the LayoutManager has collapsed to zero (null/undef
    // data or override.size === 0). Returning null here keeps them out of
    // the React tree entirely.
    if (layout.size === 0) {
      return null;
    }

    // oxlint-disable-next-line typescript/no-non-null-assertion -- slot was just assigned for this index
    const slotKey = slotAssignments.get(index)!;
    const mainPos = itemAreaOffset + layout.offset;
    const crossPos = paddingCross + layout.crossOffset;
    const isLastItem =
      numColumns > 1
        ? layout.column >= numColumns - 1 || index >= data.length - 1
        : index >= data.length - 1;

    return (
      <VirtualListCell
        key={slotKey}
        mainOffset={mainPos}
        crossOffset={crossPos}
        size={layout.size}
        crossSize={layout.crossSize}
        renderItem={renderItem}
        item={item}
        index={index}
        userKey={getKey(index)}
        shouldFocus={focusedIndex === index}
        extraData={extraData}
        horizontal={horizontal}
        isLastItem={isLastItem}
        ItemSeparatorComponent={ItemSeparatorComponent}
        isInFlex={isInFlex}
        onItemSizeChange={handleItemSizeChange}
        onItemEmpty={handleItemEmpty}
        onContentCrossLayout={handleContentCrossLayout}
        onSeparatorLayout={handleSeparatorLayout}
      />
    );
  });

  return (
    <VLStateCacheContext.Provider value={ownStateCache}>
      <FocusGroup
        style={outerStyle}
        autoFocus={autoFocus}
        onChildFocused={handleVLFocus}
        onResize={handleViewportResize}
        allowOffscreen
        trapFocusUp={trapFocusUp}
        trapFocusRight={trapFocusRight}
        trapFocusDown={trapFocusDown}
        trapFocusLeft={trapFocusLeft}
      >
        <lng-view ref={contentRef} style={contentStyle}>
          <FlexBoundary>
            {ListHeaderComponent && (
              <lng-view
                style={{
                  position: "absolute",
                  x: horizontal ? paddingStart : paddingCross,
                  y: horizontal ? paddingCross : paddingStart,
                }}
              >
                {renderListComponent(ListHeaderComponent)}
              </lng-view>
            )}

            {cells}

            {ListFooterComponent && (
              <lng-view
                style={{
                  position: "absolute",
                  x: horizontal
                    ? paddingStart + headerSize + layoutManager.totalSize
                    : paddingCross,
                  y: horizontal
                    ? paddingCross
                    : paddingStart + headerSize + layoutManager.totalSize,
                }}
              >
                {renderListComponent(ListFooterComponent)}
              </lng-view>
            )}
          </FlexBoundary>
        </lng-view>
      </FocusGroup>
    </VLStateCacheContext.Provider>
  );
}

export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: Ref<VirtualListRef> },
) => ReactElement | null;

(VirtualList as { displayName?: string }).displayName = "VirtualList";

import type { ComponentType, Ref } from 'react';
import {
  type ForwardedRef,
  type ReactElement,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  FocusGroup,
  type LightningElement,
  type LightningViewElementStyle,
} from '@plextv/react-lightning';
import {
  FlexBoundary,
  FlexRoot,
  useIsInFlex,
} from '@plextv/react-lightning-plugin-flexbox';
import { LayoutManager } from './LayoutManager';
import { RecyclerPool } from './RecyclerPool';
import { RevealGate } from './RevealGate';
import { VirtualListCell } from './VirtualListCell';
import {
  CellBoundsContext,
  VLCellKeyContext,
  type VLPersistedState,
  VLStateCacheContext,
} from './VirtualListContext';
import type { VirtualListProps, VirtualListRef } from './VirtualListTypes';
import { capSelfMeasuredViewport } from './capSelfMeasuredViewport';
import { computeItemRect } from './computeItemRect';
import { parseContentStyle } from './parseContentStyle';
import { resolveCrossSize } from './resolveCrossSize';
import { resolveRevealBoundary } from './resolveRevealBoundary';
import { resolveSectionSize } from './resolveSectionSize';
import { resolveVisibleMainSpan } from './resolveVisibleMainSpan';
import { useScrollHandler } from './useScrollHandler';
import { useViewability } from './useViewability';

// A cell reveals once its size has held steady this long — matches the
// LayoutManager's own stability window, so a size that's been quiet this long
// has no pending change left in flight.
const REVEAL_QUIET_MS = 120;
// Backstop so content that never stops resizing still reveals eventually.
const REVEAL_MAX_MS = 1000;
// Wake a touch after the computed deadline so the quiet window is safely past.
const REVEAL_CHECK_SLOP_MS = 8;

function renderListComponent(
  component: VirtualListProps<unknown>['ListHeaderComponent'],
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
    onFocus,
    onBlur,
    snapToAlignment = 'start',
    animationDuration = 300,
    autoFocus,
    trapFocusUp,
    trapFocusRight,
    trapFocusDown,
    trapFocusLeft,
    skipChildFocusScroll = false,
  } = props;

  const parentCellBounds = useContext(CellBoundsContext);
  const isInFlex = useIsInFlex();

  // Top-level VLs (no parent VL) skip persistence entirely.
  const cellKey = useContext(VLCellKeyContext);
  const parentStateCache = useContext(VLStateCacheContext);
  const initialRestoredState =
    cellKey != null && parentStateCache
      ? parentStateCache.get(cellKey)
      : undefined;
  const initialScrollOffset = initialRestoredState?.scrollOffset ?? 0;
  // State (not ref) — render-phase ref reads bail React Compiler on the
  // whole function, leaving every cell prop closure unmemoized.
  const [focusedIndex, setFocusedIndex] = useState<number | undefined>(
    initialRestoredState?.focusedIndex,
  );
  // Consumed on the next onChildFocused after a cellKey change so the FG's
  // auto-pick on row entry doesn't overwrite the restored index.
  const [skipNextFocus, setSkipNextFocus] = useState(false);
  const [ownStateCache] = useState<Map<string, VLPersistedState>>(
    () => new Map(),
  );
  const [measuredSize, setMeasuredSize] = useState({ w: 0, h: 0 });
  // Visible main-axis span from the list's stage position to the stage edge,
  // tracked on resize. Caps the self-measured viewport fallback below.
  const outerElementRef = useRef<LightningElement>(null);
  const [visibleMainSpan, setVisibleMainSpan] = useState(0);
  const [, setLayoutVersion] = useState(0);
  const [separatorSize, setSeparatorSize] = useState(0);
  const separatorSizeRef = useRef(0);
  const [measuredHeaderSize, setMeasuredHeaderSize] = useState(0);
  const measuredHeaderSizeRef = useRef(0);
  const [measuredFooterSize, setMeasuredFooterSize] = useState(0);
  const measuredFooterSizeRef = useRef(0);
  // Monotonic per-dataset: once a cell reports cross=N, stays at N or
  // larger until data/extraData identity changes.
  const [maxContentCross, setMaxContentCross] = useState(0);
  const maxContentCrossRef = useRef(0);
  // Bumped whenever the cross measurement is reset, to make mounted cells
  // re-push their current cross so it climbs back (see the reset effect).
  const [crossGeneration, setCrossGeneration] = useState(0);
  // A row measures bottom-up and async: it reports a placeholder size, then
  // grows to its real height. `revealGate` tracks how long each cell's size has
  // held steady so the list can keep a cell hidden until it settles, then paint
  // it once at its final height instead of on-screen growing (which shoves the
  // rows below it down). Starts at -1: nothing paints until the gate settles it.
  const [revealGate] = useState(() => new RevealGate());
  const [revealThrough, setRevealThrough] = useState(-1);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const padding = parseContentStyle(contentContainerStyle);

  const paddingStart = horizontal ? padding.left : padding.top;
  const paddingEnd = horizontal ? padding.right : padding.bottom;
  const paddingCross = horizontal ? padding.top : padding.left;
  const paddingCrossEnd = horizontal ? padding.bottom : padding.right;
  const crossPadding = paddingCross + paddingCrossEnd;
  const headerSize = resolveSectionSize(
    !!ListHeaderComponent,
    measuredHeaderSize,
    listHeaderSize,
  );
  const footerSize = resolveSectionSize(
    !!ListFooterComponent,
    measuredFooterSize,
    listFooterSize,
  );
  const itemAreaOffset = paddingStart + headerSize;

  // Main axis: explicit style > parent cell bounds > self-measured.
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
    capSelfMeasuredViewport(measuredOuterMain, visibleMainSpan);

  const explicitCross = horizontal
    ? (style?.h as number | undefined)
    : (style?.w as number | undefined);
  const parentCross = horizontal
    ? parentCellBounds?.height
    : parentCellBounds?.width;
  const measuredOuterCross = horizontal ? measuredSize.h : measuredSize.w;

  const { viewportCrossSize, isDefinite: crossSizeIsDefinite } =
    resolveCrossSize({
      horizontal,
      explicitCross,
      parentCross,
      measuredOuterCross,
      maxContentCross,
      crossPadding,
    });

  const cellCrossSize = (viewportCrossSize - crossPadding) / numColumns;

  // Header/footer span the full cell area (all columns). Pin their FlexRoot's
  // cross axis under the same definiteness rule as the cells, so flex content
  // (e.g. a stretch Column) fills the list width instead of shrink-fitting.
  const sectionCrossSize = viewportCrossSize - crossPadding;
  const sectionFlexStyle = crossSizeIsDefinite
    ? horizontal
      ? { h: sectionCrossSize }
      : { w: sectionCrossSize }
    : undefined;

  // Lazy-init the LayoutManager via useState — the previous
  // `useRef(null) + if (!ref.current) ref.current = new ...` pattern is a
  // render-phase ref read AND write, which causes React Compiler to bail
  // on memoizing `VirtualListInner`. `useState(() => new ...)` does the
  // same thing and is compiler-friendly. Initial-mount-only side effects
  // (measurement restore, onChange wiring) live inside the initializer.
  const [layoutManager] = useState<LayoutManager<T>>(() => {
    const lm = new LayoutManager<T>({
      data,
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
    numColumns,
    overrideItemLayout,
    extraData,
    cellCrossSize,
    keyExtractor,
    separatorSize,
  ]);

  const [pool] = useState<RecyclerPool>(() => new RecyclerPool());
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
  const finalCross =
    viewportCrossSize > 0
      ? viewportCrossSize
      : cellCrossSize * numColumns + crossPadding;

  // While true, contentStyle omits x/y so reconciliation can't clobber the
  // imperative scroll animation in flight.
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

  // Declared BEFORE `pool.reconcile(...)` below — that call is React
  // Compiler 1.0's optimization boundary in this function, so anything
  // declared after it is emitted unmemoized.
  const handleItemSizeChange = (
    userKey: string,
    measuredSize: number,
    final = false,
  ) => {
    let changed = layoutManager.reportItemSize(userKey, measuredSize, final);

    // A settled (final) size is authoritative — reveal it without the quiet
    // window. markFinal returns true only the first time, so this bumps once.
    if (final && revealGate.markFinal(userKey)) {
      changed = true;
    }

    if (changed) {
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

  const handleHeaderLayout = (event: { w: number; h: number }) => {
    const main = horizontal ? event.w : event.h;

    if (main > 0 && Math.abs(main - measuredHeaderSizeRef.current) >= 1) {
      measuredHeaderSizeRef.current = main;
      setMeasuredHeaderSize(main);
    }
  };

  const handleFooterLayout = (event: { w: number; h: number }) => {
    const main = horizontal ? event.w : event.h;

    if (main > 0 && Math.abs(main - measuredFooterSizeRef.current) >= 1) {
      measuredFooterSizeRef.current = main;
      setMeasuredFooterSize(main);
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

  // Backstop for non-focus scrolls (touch/wheel/imperative scrollToOffset).
  // Focus-driven scrolls write to the cache directly via handleVLFocus.
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

  // Recycle into a different row: save outgoing state and restore incoming.
  // setState during render so this render uses the new state — avoids a
  // flash of stale scroll/focus.
  const [prevCellKey, setPrevCellKey] = useState(cellKey);

  if (prevCellKey !== cellKey) {
    if (prevCellKey != null && parentStateCache) {
      parentStateCache.set(prevCellKey, {
        scrollOffset: committedScrollOffset,
        focusedIndex,
        measurements: layoutManager.getMeasurements(),
      });
    }

    // Synchronous config update so cells in THIS render lay out against
    // the new data with correctly-keyed measurements (the useLayoutEffect
    // that calls updateConfig hasn't fired yet).
    layoutManager.updateConfig({
      data,
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

  // Order matters: resolve target index FIRST (child position relative to
  // contentRef is scroll-independent), then run alignment (which updates
  // scrollOffsetRef.current synchronously to the snap target), THEN write
  // to the cache. Writing before alignment captures the pre-scroll offset
  // and restore requires a second focus event to converge.
  const handleVLFocus = (child: LightningElement) => {
    if (skipNextFocus) {
      setSkipNextFocus(false);

      if (!skipChildFocusScroll) {
        handleChildFocused(child);
      }

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

    if (!skipChildFocusScroll) {
      handleChildFocused(child);
    }

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

  // Reveal gate: paint the visible cells only up to the first one whose size
  // hasn't settled, so a growing row stays hidden until it reaches its final
  // height. Runs after every commit (measurements arrive between renders) and
  // schedules a re-check for the soonest pending cell. Fixed-size lists
  // (override-pinned cells) are all exempt, so this is a no-op there.
  useLayoutEffect(() => {
    const now = Date.now();
    const order: number[] = [];

    for (const index of visibleIndices) {
      const item = data[index];

      if (item == null) {
        continue;
      }

      const layout = layoutManager.getLayout(index);

      if (!layout || layout.size === 0) {
        continue;
      }

      order.push(index);

      const key = getKey(index);

      if (layoutManager.isMeasured(index)) {
        revealGate.note(key, layout.size, now);
      } else {
        // Visible but not measured yet: start the backstop so a stuck async
        // cell can't hold the rows below it hidden forever.
        revealGate.markSeen(key, now);
      }
    }

    const { revealThrough: nextRevealThrough, nextCheckMs } =
      resolveRevealBoundary(
        order,
        (index) => layoutManager.hasOverrideSize(index),
        (index) =>
          revealGate.timeUntilSettled(
            getKey(index),
            now,
            REVEAL_QUIET_MS,
            REVEAL_MAX_MS,
          ),
      );

    // Latch every cell up to the boundary as revealed so a later re-measure
    // (background refresh of an already-visible row) can't hide it again.
    for (const index of order) {
      if (index > nextRevealThrough) {
        break;
      }

      revealGate.markRevealed(getKey(index));
    }

    setRevealThrough((prev) =>
      prev === nextRevealThrough ? prev : nextRevealThrough,
    );

    if (revealTimerRef.current != null) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = undefined;
    }

    if (Number.isFinite(nextCheckMs) && nextCheckMs > 0) {
      revealTimerRef.current = setTimeout(() => {
        setLayoutVersion((v) => v + 1);
      }, nextCheckMs + REVEAL_CHECK_SLOP_MS);
    }

    return () => {
      if (revealTimerRef.current != null) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = undefined;
      }
    };
  });

  const getType = (index: number): number | string =>
    // oxlint-disable-next-line typescript/no-non-null-assertion -- index is within data bounds
    getItemType?.(data[index]!, index, extraData) ?? 0;

  const slotAssignments = pool.reconcile(visibleIndices, getType);

  // Per-key measurements deliberately NOT cleared on data identity change —
  // tab switches re-create the array even when userKeys are identical, and
  // re-measuring from estimate would shift rows visibly. Callers can call
  // `layoutManager.clearMeasurements()` imperatively when they need it.
  // A data-identity change can be a recycle to a shorter row (cross must
  // shrink) or an in-place refresh keeping the same items (cross must NOT
  // collapse). Zero it, then bump the generation so every mounted cell
  // re-pushes its current cross: recycled cells report the new height,
  // refreshed cells report the same one, and grow-only settles on the real
  // max either way. Without the re-push a same-key refresh (mergeData) left
  // cross stuck at 0 and clipped taller-than-default content.
  useLayoutEffect(() => {
    maxContentCrossRef.current = 0;
    setMaxContentCross(0);
    setCrossGeneration((g) => g + 1);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- intentional reset on data identity change
  }, [data, extraData]);

  const handleViewportResize = (event: { w: number; h: number }) => {
    setMeasuredSize((prev) =>
      prev.w === event.w && prev.h === event.h ? prev : event,
    );

    // A canvas-overflowing (or overflow-margin-inflated) list is flex-sized
    // past the screen; capSelfMeasuredViewport needs the visible span to rein
    // the viewport back to what is on screen. Horizontal too: the centered
    // switch-user row inflates its width via a negative right margin.
    const el = outerElementRef.current;

    if (el) {
      const root = el.rootElement;
      const pos = el.getRelativePosition(root);
      const span = resolveVisibleMainSpan(
        horizontal,
        root.node.w,
        root.node.h,
        pos.x,
        pos.y,
      );

      setVisibleMainSpan((prev) => (prev === span ? prev : span));
    }
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
    getLayout: (index) => {
      const layout = layoutManager.getLayout(index);

      return layout
        ? computeItemRect(layout, itemAreaOffset, paddingCross, horizontal)
        : undefined;
    },
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
          autoFocus={autoFocus}
          style={outerStyle}
          trapFocusDown={trapFocusDown}
          trapFocusLeft={trapFocusLeft}
          trapFocusRight={trapFocusRight}
          trapFocusUp={trapFocusUp}
        >
          {renderListComponent(ListEmptyComponent)}
        </FocusGroup>
      </VLStateCacheContext.Provider>
    );
  }

  const scrollPosition = -committedScrollOffset;
  // Skip x/y while a scroll animation is in flight; the imperative
  // node.animate() owns position during that window. Re-applying the
  // target on a mid-animation render snaps past the interpolated value.
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

    const layout = layoutManager.getLayout(index);

    // Skip cells the LayoutManager has collapsed to zero (null/undef data or
    // override.size === 0), and indices gone stale mid-render (the cellKey
    // restore path updates the config synchronously after visibleIndices was
    // computed, so a data shrink can leave indices past the new count).
    if (!layout || layout.size === 0) {
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
        ItemSeparatorComponent={ItemSeparatorComponent}
        crossGeneration={crossGeneration}
        crossOffset={crossPos}
        crossSize={layout.crossSize}
        extraData={extraData}
        horizontal={horizontal}
        index={index}
        isInFlex={isInFlex}
        isLastItem={isLastItem}
        item={item}
        mainOffset={mainPos}
        pinCrossAxis={crossSizeIsDefinite}
        renderItem={renderItem}
        shouldFocus={focusedIndex === index}
        size={layout.size}
        userKey={getKey(index)}
        withholdPaint={index > revealThrough && focusedIndex !== index}
        onContentCrossLayout={handleContentCrossLayout}
        onItemEmpty={handleItemEmpty}
        onItemSizeChange={handleItemSizeChange}
        onSeparatorLayout={handleSeparatorLayout}
      />
    );
  });

  return (
    <VLStateCacheContext.Provider value={ownStateCache}>
      <FocusGroup
        ref={outerElementRef}
        allowOffscreen={true}
        autoFocus={autoFocus}
        style={outerStyle}
        trapFocusDown={trapFocusDown}
        trapFocusLeft={trapFocusLeft}
        trapFocusRight={trapFocusRight}
        trapFocusUp={trapFocusUp}
        onBlur={onBlur}
        onChildFocused={handleVLFocus}
        onFocus={onFocus}
        onResize={handleViewportResize}
      >
        <lng-view ref={contentRef} style={contentStyle}>
          <FlexBoundary>
            {ListHeaderComponent ? (
              <lng-view
                style={{
                  position: 'absolute',
                  x: horizontal ? paddingStart : paddingCross,
                  y: horizontal ? paddingCross : paddingStart,
                }}
              >
                {isInFlex ? (
                  <FlexRoot
                    style={sectionFlexStyle}
                    onResize={handleHeaderLayout}
                  >
                    {renderListComponent(ListHeaderComponent)}
                  </FlexRoot>
                ) : (
                  renderListComponent(ListHeaderComponent)
                )}
              </lng-view>
            ) : null}

            {cells}

            {ListFooterComponent ? (
              <lng-view
                style={{
                  position: 'absolute',
                  x: horizontal
                    ? paddingStart + headerSize + layoutManager.totalSize
                    : paddingCross,
                  y: horizontal
                    ? paddingCross
                    : paddingStart + headerSize + layoutManager.totalSize,
                }}
              >
                {isInFlex ? (
                  <FlexRoot
                    style={sectionFlexStyle}
                    onResize={handleFooterLayout}
                  >
                    {renderListComponent(ListFooterComponent)}
                  </FlexRoot>
                ) : (
                  renderListComponent(ListFooterComponent)
                )}
              </lng-view>
            ) : null}
          </FlexBoundary>
        </lng-view>
      </FocusGroup>
    </VLStateCacheContext.Provider>
  );
}

export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: Ref<VirtualListRef> },
) => ReactElement | null;

(VirtualList as { displayName?: string }).displayName = 'VirtualList';

import type { ComponentType, Ref } from 'react';
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
} from 'react';

import {
  FocusGroup,
  type LightningElement,
  type LightningViewElementStyle,
} from '@plextv/react-lightning';
import { FlexBoundary, useIsInFlex } from '@plextv/react-lightning-plugin-flexbox';

import { LayoutManager } from './LayoutManager';
import { parseContentStyle } from './parseContentStyle';
import { RecyclerPool } from './RecyclerPool';
import { useScrollHandler } from './useScrollHandler';
import { useViewability } from './useViewability';
import { VirtualListCell } from './VirtualListCell';
import {
  CellBoundsContext,
  type VLPersistedState,
  VLCellKeyContext,
  VLStateCacheContext,
} from './VirtualListContext';
import type { VirtualListProps, VirtualListRef } from './VirtualListTypes';

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

function VirtualListInner<T>(props: VirtualListProps<T>, ref: ForwardedRef<VirtualListRef>) {
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
    snapToAlignment = 'start',
    animationDuration = 300,
    autoFocus,
    trapFocusUp,
    trapFocusRight,
    trapFocusDown,
    trapFocusLeft,
  } = props;

  const parentCellBounds = useContext(CellBoundsContext);
  const isInFlex = useIsInFlex();

  // Top-level VLs (no parent VL) skip persistence entirely.
  const cellKey = useContext(VLCellKeyContext);
  const parentStateCache = useContext(VLStateCacheContext);
  const initialRestoredState =
    cellKey != null && parentStateCache ? parentStateCache.get(cellKey) : undefined;
  const initialScrollOffset = initialRestoredState?.scrollOffset ?? 0;
  // State (not ref) — render-phase ref reads bail React Compiler on the
  // whole function, leaving every cell prop closure unmemoized.
  const [focusedIndex, setFocusedIndex] = useState<number | undefined>(
    initialRestoredState?.focusedIndex,
  );
  // Consumed on the next onChildFocused after a cellKey change so the FG's
  // auto-pick on row entry doesn't overwrite the restored index.
  const [skipNextFocus, setSkipNextFocus] = useState(false);
  const [ownStateCache] = useState<Map<string, VLPersistedState>>(() => new Map());
  const [measuredSize, setMeasuredSize] = useState({ w: 0, h: 0 });
  const [, setLayoutVersion] = useState(0);
  const [separatorSize, setSeparatorSize] = useState(0);
  const separatorSizeRef = useRef(0);
  // Monotonic per-dataset: once a cell reports cross=N, stays at N or
  // larger until data/extraData identity changes.
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

  // Main axis: explicit style > parent cell bounds > self-measured.
  const explicitMain = horizontal
    ? (style?.w as number | undefined)
    : (style?.h as number | undefined);
  const parentMain = horizontal ? parentCellBounds?.width : parentCellBounds?.height;
  const measuredOuterMain = horizontal ? measuredSize.w : measuredSize.h;
  const viewportSize =
    explicitMain ?? parentMain ?? (measuredOuterMain > 0 ? measuredOuterMain : 0);

  const explicitCross = horizontal
    ? (style?.h as number | undefined)
    : (style?.w as number | undefined);
  const parentCross = horizontal ? parentCellBounds?.height : parentCellBounds?.width;
  const measuredOuterCross = horizontal ? measuredSize.h : measuredSize.w;

  let viewportCrossSize: number;

  // Cross-axis priority differs by orientation. Vertical: parent/measured
  // cross is reliable (parent flex allocates column width). Horizontal:
  // parent/measured cross is the OUTER cell's full height (title + this VL
  // + siblings) which is bigger than the cards themselves — prefer
  // content-driven `maxContentCross` and only fall back when no content
  // has measured yet. Without the asymmetry the cells oscillate as the
  // outer cell's measured height churns during scroll/focus animations.
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

  const [pool] = useState<RecyclerPool>(() => new RecyclerPool());
  const getKey = (index: number): string =>
    keyExtractor && data[index] !== undefined ? keyExtractor(data[index], index) : String(index);
  const getData = (i: number) => data[i];
  const getLayout = (i: number) => layoutManager.getLayout(i);

  const totalContentSize =
    paddingStart + headerSize + layoutManager.totalSize + footerSize + paddingEnd;
  const finalCross =
    viewportCrossSize > 0 ? viewportCrossSize : cellCrossSize * numColumns + crossPadding;

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
  }, [cellKey, committedScrollOffset, focusedIndex, parentStateCache, layoutManager]);

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
      estimatedItemSize,
      numColumns,
      overrideItemLayout,
      extraData,
      cellCrossSize,
      keyExtractor,
      separatorSize,
    });

    const incoming =
      cellKey != null && parentStateCache ? parentStateCache.get(cellKey) : undefined;

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
  const visibleRange = layoutManager.getVisibleRange(scrollInItemSpace, viewportSize, drawDistance);
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

  // Per-key measurements deliberately NOT cleared on data identity change —
  // tab switches re-create the array even when userKeys are identical, and
  // re-measuring from estimate would shift rows visibly. Callers can call
  // `layoutManager.clearMeasurements()` imperatively when they need it.
  useLayoutEffect(() => {
    maxContentCrossRef.current = 0;
    setMaxContentCross(0);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- intentional reset on data identity change
  }, [data, extraData]);

  const handleViewportResize = (event: { w: number; h: number }) => {
    setMeasuredSize((prev) => (prev.w === event.w && prev.h === event.h ? prev : event));
  };

  useImperativeHandle(ref, () => ({
    scrollToIndex: (params) =>
      scrollToIndex(params.index, params.animated, params.viewPosition, params.viewOffset),
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
    ...(padding.backgroundColor != null ? { color: padding.backgroundColor } : undefined),
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
                  position: 'absolute',
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
                  position: 'absolute',
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

(VirtualList as { displayName?: string }).displayName = 'VirtualList';

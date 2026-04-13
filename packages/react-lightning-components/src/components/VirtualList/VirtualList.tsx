import type { ComponentType, Ref } from 'react';
import {
  type ForwardedRef,
  forwardRef,
  isValidElement,
  type ReactElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  FocusGroup,
  type LightningElement,
  type LightningViewElementStyle,
} from '@plextv/react-lightning';

import { LayoutManager } from './LayoutManager';
import { parseContentStyle } from './parseContentStyle';
import { RecyclerPool } from './RecyclerPool';
import { useScrollHandler } from './useScrollHandler';
import { useViewability } from './useViewability';
import { VirtualListCell } from './VirtualListCell';
import { VirtualListContent } from './VirtualListContent';
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
  'use no memo';

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

  const [measuredSize, setMeasuredSize] = useState({ w: 0, h: 0 });
  const [, setLayoutVersion] = useState(0);
  const [separatorSize, setSeparatorSize] = useState(0);
  const padding = parseContentStyle(contentContainerStyle);
  const viewportWidth = (style?.w as number) || measuredSize.w;
  const viewportHeight = (style?.h as number) || measuredSize.h;
  const viewportSize = horizontal ? viewportWidth : viewportHeight;
  const viewportCrossSize = horizontal ? viewportHeight : viewportWidth;
  const layoutManagerRef = useRef<LayoutManager<T> | null>(null);

  if (!layoutManagerRef.current) {
    layoutManagerRef.current = new LayoutManager<T>({
      data,
      estimatedItemSize,
      numColumns,
      overrideItemLayout,
      extraData,
      separatorSize: 0,
    });
  }

  const layoutManager = layoutManagerRef.current;

  useLayoutEffect(() => {
    if (
      layoutManager.updateConfig({
        data,
        estimatedItemSize,
        numColumns,
        overrideItemLayout,
        extraData,
      })
    ) {
      setLayoutVersion((v) => v + 1);
    }
  }, [data, estimatedItemSize, numColumns, overrideItemLayout, extraData]);

  const poolRef = useRef<RecyclerPool | null>(null);

  if (!poolRef.current) {
    poolRef.current = new RecyclerPool();
  }

  const pool = poolRef.current;
  const cellNodesRef = useRef(new Map<string, LightningElement>());
  const getKey = (index: number): string =>
    keyExtractor && data[index] !== undefined ? keyExtractor(data[index], index) : String(index);
  const getData = (i: number) => data[i];
  const getLayout = (i: number) => layoutManager.getLayout(i);

  const paddingStart = horizontal ? padding.left : padding.top;
  const paddingEnd = horizontal ? padding.right : padding.bottom;
  const paddingCross = horizontal ? padding.top : padding.left;
  const paddingCrossEnd = horizontal ? padding.bottom : padding.right;
  const headerSize = ListHeaderComponent ? listHeaderSize : 0;
  const footerSize = ListFooterComponent ? listFooterSize : 0;
  const itemAreaOffset = paddingStart + headerSize;
  const totalContentSize =
    paddingStart + headerSize + layoutManager.totalSize + footerSize + paddingEnd;
  const contentCross = layoutManager.maxCrossSize || estimatedItemSize;
  const crossPadding = paddingCross + paddingCrossEnd;
  const contentCrossWithPadding = contentCross + crossPadding;
  const finalCross = horizontal
    ? Math.max(viewportCrossSize, contentCrossWithPadding)
    : viewportCrossSize || contentCrossWithPadding;
  const separatorCross = numColumns > 1 ? separatorSize : 0;
  const cellCrossSize =
    ((viewportCrossSize || contentCross) - crossPadding - separatorCross * (numColumns - 1)) /
    numColumns;

  const flushWithAnchorRef = useRef<() => void>(() => {});

  const {
    contentRef,
    scrollOffsetRef,
    animatingRef,
    computeVisibleRange,
    scrollToOffset,
    scrollToIndex,
    scrollToEnd,
    handleChildFocused,
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
    onAnimationEnd: () => flushWithAnchorRef.current(),
    onBeforeScroll: () => flushWithAnchorRef.current(),
    paddingStart,
    paddingEnd,
  });

  // Assigned in a layout effect to avoid ref mutation during render.
  useLayoutEffect(() => {
    flushWithAnchorRef.current = () => {
      if (!layoutManager.hasPendingMeasurements) {
        return;
      }

      const range = computeVisibleRange();
      const anchorIndex = range.endIndex >= range.startIndex ? range.startIndex : undefined;
      const { changed, anchorDelta } = layoutManager.flushDeferred(anchorIndex);

      if (!changed) {
        return;
      }

      if (anchorDelta !== 0) {
        const adjusted = scrollOffsetRef.current + anchorDelta;
        scrollOffsetRef.current = adjusted;
        const el = contentRef.current;
        if (el) {
          const value = -adjusted;
          if (horizontal) {
            el.node.x = value;
          } else {
            el.node.y = value;
          }
        }
      }

      setLayoutVersion((v) => v + 1);
    };
  });

  const visibleRange = computeVisibleRange();
  const visibleIndices: number[] = [];

  if (data.length > 0 && visibleRange.endIndex >= visibleRange.startIndex) {
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      visibleIndices.push(i);
    }
  }

  const scrollInItemSpace = Math.max(0, scrollOffsetRef.current - itemAreaOffset);
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
  const separatorSizeRef = useRef(0);

  const handleItemSizeChange = useCallback(
    (index: number, size: number, crossSize: number) => {
      if (animatingRef.current) {
        const layout = layoutManager.getLayout(index);
        if (layout) {
          const itemStart = itemAreaOffset + layout.offset;
          const itemEnd = itemStart + layout.size;
          const viewStart = scrollOffsetRef.current;
          const viewEnd = viewStart + viewportSize;
          if (itemEnd < viewStart || itemStart > viewEnd) {
            layoutManager.deferMeasurement(index, size, crossSize);
            return;
          }
        }
      }

      if (layoutManager.reportItemSize(index, size, crossSize)) {
        setLayoutVersion((v) => v + 1);
      }
    },
    [itemAreaOffset, viewportSize],
  );

  const handleCellNodeRef = useCallback((key: string, node: LightningElement | null) => {
    if (node) {
      cellNodesRef.current.set(key, node);
    } else {
      cellNodesRef.current.delete(key);
    }
  }, []);

  const handleSeparatorLayout = useCallback((size: number) => {
    if (size > 0 && size !== separatorSizeRef.current) {
      separatorSizeRef.current = size;
      setSeparatorSize(size);
      layoutManager.updateConfig({ separatorSize: size });
    }
  }, []);

  const handleViewportLayout = useCallback(
    (event: { w: number; h: number }) => {
      setMeasuredSize((prev) => {
        if (prev.w === event.w && prev.h === event.h) {
          return prev;
        }

        return event;
      });

      onLayout?.(event);
    },
    [onLayout],
  );

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

  // Update cell positions directly on nodes to avoid re-rendering for position-only changes.
  useLayoutEffect(() => {
    for (const index of visibleIndices) {
      const layout = layoutManager.getLayout(index);

      if (!layout) {
        continue;
      }

      const slotKey = slotAssignments.get(index);

      if (!slotKey) {
        continue;
      }

      const cellNode = cellNodesRef.current.get(slotKey);

      if (!cellNode) {
        continue;
      }

      const mainPos = itemAreaOffset + layout.offset;
      const crossPos =
        numColumns > 1
          ? paddingCross + layout.column * (cellCrossSize + separatorCross)
          : paddingCross + layout.crossOffset;
      const targetX = horizontal ? mainPos : crossPos;
      const targetY = horizontal ? crossPos : mainPos;

      if (cellNode.node.x !== targetX || cellNode.node.y !== targetY) {
        cellNode.node.x = targetX;
        cellNode.node.y = targetY;
      }
    }
  });

  const outerStyle = useMemo<LightningViewElementStyle>(() => {
    const boundsDistance = drawDistance * 2;

    return {
      flexGrow: horizontal ? undefined : 1,
      flexShrink: horizontal ? undefined : 1,
      clipping: true,
      boundsMargin: horizontal
        ? [0, boundsDistance, 0, boundsDistance]
        : [boundsDistance, 0, boundsDistance, 0],
      ...style,
      ...(padding.backgroundColor != null ? { color: padding.backgroundColor } : undefined),
    };
  }, [horizontal, drawDistance, style, padding.backgroundColor]);

  if (data.length === 0 && ListEmptyComponent) {
    return (
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
    );
  }

  const scrollPosition = -scrollOffsetRef.current;
  const contentStyle: LightningViewElementStyle = horizontal
    ? {
        w: totalContentSize,
        h: finalCross,
        x: scrollPosition,
      }
    : {
        w: finalCross,
        h: totalContentSize,
        y: scrollPosition,
      };

  const cells = visibleIndices.map((index) => {
    const item = data[index];

    if (item == null) {
      return null;
    }

    // oxlint-disable-next-line typescript/no-non-null-assertion -- layout exists for all visible indices
    const layout = layoutManager.getLayout(index)!;
    // oxlint-disable-next-line typescript/no-non-null-assertion -- slot was just assigned for this index
    const slotKey = slotAssignments.get(index)!;
    const mainPos = itemAreaOffset + layout.offset;
    const crossPos =
      numColumns > 1
        ? paddingCross + layout.column * (cellCrossSize + separatorCross)
        : paddingCross + layout.crossOffset;

    const isLastItem =
      numColumns > 1
        ? layout.column >= numColumns - 1 || index >= data.length - 1
        : index >= data.length - 1;

    return (
      <VirtualListCell
        key={slotKey}
        mainOffset={mainPos}
        crossOffset={crossPos}
        renderItem={renderItem}
        item={item}
        index={index}
        extraData={extraData}
        horizontal={horizontal}
        numColumns={numColumns}
        itemSize={layout.size}
        cellCrossSize={cellCrossSize}
        isLastItem={isLastItem}
        ItemSeparatorComponent={ItemSeparatorComponent}
        onItemSizeChange={handleItemSizeChange}
        onSeparatorLayout={handleSeparatorLayout}
        cellKey={slotKey}
        onNodeRef={handleCellNodeRef}
      />
    );
  });

  return (
    <FocusGroup
      style={outerStyle}
      autoFocus={autoFocus}
      onChildFocused={handleChildFocused}
      onLayout={handleViewportLayout}
      allowOffscreen
      trapFocusUp={trapFocusUp}
      trapFocusRight={trapFocusRight}
      trapFocusDown={trapFocusDown}
      trapFocusLeft={trapFocusLeft}
    >
      <VirtualListContent style={contentStyle} ref={contentRef}>
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
              x: horizontal ? paddingStart + headerSize + layoutManager.totalSize : paddingCross,
              y: horizontal ? paddingCross : paddingStart + headerSize + layoutManager.totalSize,
            }}
          >
            {renderListComponent(ListFooterComponent)}
          </lng-view>
        )}
      </VirtualListContent>
    </FocusGroup>
  );
}

export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: Ref<VirtualListRef> },
) => ReactElement | null;

(VirtualList as { displayName?: string }).displayName = 'VirtualList';

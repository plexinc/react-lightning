import type { ComponentType, ReactElement } from 'react';

import type { LightningViewElementStyle } from '@plextv/react-lightning';

export interface VirtualListRenderItemInfo<T> {
  item: T;
  index: number;
  extraData?: unknown;
  /**
   * True when this item should receive focus on mount — set by VirtualList
   * when restoring a previously-focused item after a recycle remount. Pass
   * to the focusable element's autoFocus prop.
   */
  shouldFocus?: boolean;
}

export interface OverrideItemLayout {
  size?: number;
  span?: number;
}

export type OverrideItemLayoutFn<T> = (
  layout: OverrideItemLayout,
  item: T,
  index: number,
  maxColumns: number,
  extraData?: unknown,
) => void;

export interface ContentStyle {
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  padding?: number;
  paddingVertical?: number;
  paddingHorizontal?: number;
  backgroundColor?: number;
}

export interface ViewToken<T> {
  item: T;
  key: string;
  index: number;
  isViewable: boolean;
  timestamp: number;
}

export interface ViewabilityConfig {
  itemVisiblePercentThreshold?: number;
  viewAreaCoveragePercentThreshold?: number;
  minimumViewTime?: number;
  waitForInteraction?: boolean;
}

export interface ScrollEvent {
  contentInset: { top: number; left: number; bottom: number; right: number };
  contentOffset: { x: number; y: number };
  contentSize: { width: number; height: number };
  layoutMeasurement: { width: number; height: number };
}

export interface VirtualListProps<T> {
  /** Array of data items to render. */
  data: ReadonlyArray<T>;
  /** Render function for each item. */
  renderItem: (info: VirtualListRenderItemInfo<T>) => ReactElement;
  /** Average or median item size. Used before items are measured. Default 200. */
  estimatedItemSize?: number;
  /** Scroll horizontally instead of vertically. */
  horizontal?: boolean;
  /** Number of columns for grid layout. Default 1. */
  numColumns?: number;
  /** Pixels to render beyond the visible viewport. Default 250. */
  drawDistance?: number;
  /** Extract a stable key for an item. Falls back to index. */
  keyExtractor?: (item: T, index: number) => string;
  /** Changing this forces a re-render of all items. */
  extraData?: unknown;

  /** Padding and background for the list content area. */
  contentContainerStyle?: ContentStyle;
  /** Style for the outer list container. Must include w and h. */
  style?: LightningViewElementStyle;

  /** Component rendered before the first item. */
  ListHeaderComponent?: ComponentType | ReactElement | null;
  /** Size of the header along the scroll axis. */
  listHeaderSize?: number;
  /** Component rendered after the last item. */
  ListFooterComponent?: ComponentType | ReactElement | null;
  /** Size of the footer along the scroll axis. */
  listFooterSize?: number;
  /** Component rendered when data is empty. */
  ListEmptyComponent?: ComponentType | ReactElement | null;
  /** Component rendered between items. */
  ItemSeparatorComponent?: ComponentType | null;

  /** Override size or span per-item. Must be fast — called frequently. */
  overrideItemLayout?: OverrideItemLayoutFn<T>;
  /** Return a type for recycling pools. Items of same type reuse views. */
  getItemType?: (item: T, index: number, extraData?: unknown) => string | number;

  /** Scroll to this index on mount. */
  initialScrollIndex?: number;
  /** Additional params for initialScrollIndex. */
  initialScrollIndexParams?: { viewOffset?: number };
  /** Called when the user scrolls near the end. */
  onEndReached?: () => void;
  /** How close to the end (in viewport fractions) triggers onEndReached. Default 0.5. */
  onEndReachedThreshold?: number;
  /** Called on every scroll position change. */
  onScroll?: (event: ScrollEvent) => void;
  /** Called when viewable items change. */
  onViewableItemsChanged?: (info: {
    viewableItems: ViewToken<T>[];
    changed: ViewToken<T>[];
  }) => void;
  /** Configuration for viewability tracking. */
  viewabilityConfig?: ViewabilityConfig;
  /** Called once when the list first renders items. */
  onLoad?: (info: { elapsedTimeInMs: number }) => void;

  /** Called when the content dimensions change (e.g. items measured, data changed). */
  onLayout?: (rect: { w: number; h: number }) => void;

  /** Snap scroll alignment when focusing items. Default 'start'. */
  snapToAlignment?: 'start' | 'center' | 'end';
  /** Duration of scroll animations in ms. Default 300. */
  animationDuration?: number;

  /** Auto-focus the first focusable child on mount. */
  autoFocus?: boolean;
  trapFocusUp?: boolean;
  trapFocusRight?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
}

export interface VirtualListRef {
  scrollToIndex: (params: {
    index: number;
    animated?: boolean;
    viewPosition?: number;
    viewOffset?: number;
  }) => void;
  scrollToOffset: (params: { offset: number; animated?: boolean }) => void;
  scrollToEnd: (params?: { animated?: boolean }) => void;
  getScrollOffset: () => number;
  getVisibleRange: () => { startIndex: number; endIndex: number };
}

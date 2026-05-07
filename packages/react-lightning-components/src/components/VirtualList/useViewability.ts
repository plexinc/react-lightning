import { useEffect, useState } from 'react';

import type { ComputedLayout } from './LayoutManager';
import { ViewabilityTracker } from './ViewabilityTracker';
import type { ViewabilityConfig, ViewToken } from './VirtualListTypes';

export interface UseViewabilityOptions<T> {
  viewabilityConfig?: ViewabilityConfig | null;
  onViewableItemsChanged?:
    | ((info: { viewableItems: ViewToken<T>[]; changed: ViewToken<T>[] }) => void)
    | null;
  getLayout: (index: number) => ComputedLayout | undefined;
  getData: (index: number) => T | undefined;
  getKey: (index: number) => string;
  visibleIndices: number[];
  scrollOffset: number;
  viewportSize: number;
  horizontal: boolean | null | undefined;
}

export function useViewability<T>(options: UseViewabilityOptions<T>): void {
  const {
    viewabilityConfig,
    onViewableItemsChanged,
    getLayout,
    getData,
    getKey,
    visibleIndices,
    scrollOffset,
    viewportSize,
    horizontal,
  } = options;

  const [tracker] = useState(
    () =>
      new ViewabilityTracker<T>({
        viewabilityConfig,
        onViewableItemsChanged,
        getLayout,
        getData,
        getKey,
      }),
  );

  useEffect(() => {
    tracker.updateConfig({
      viewabilityConfig,
      onViewableItemsChanged,
      getLayout,
      getData,
      getKey,
    });
  }, [viewabilityConfig, onViewableItemsChanged, getLayout, getData, getKey]);

  useEffect(() => {
    tracker.update(visibleIndices, scrollOffset, viewportSize);
  }, [visibleIndices, scrollOffset, viewportSize, horizontal]);

  useEffect(() => {
    return () => {
      tracker.dispose();
    };
  }, []);
}

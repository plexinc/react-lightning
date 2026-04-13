import type { ComponentType, ReactElement } from 'react';
import { memo, useEffect, useLayoutEffect, useRef } from 'react';

import type { LightningElement, LightningViewElementStyle } from '@plextv/react-lightning';

import type { VirtualListRenderItemInfo } from './VirtualListTypes';

export interface VirtualListCellProps<T> {
  mainOffset: number;
  crossOffset: number;
  renderItem: (info: VirtualListRenderItemInfo<T>) => ReactElement;
  item: T;
  index: number;
  extraData?: unknown;
  horizontal: boolean;
  numColumns: number;
  itemSize: number;
  cellCrossSize: number;
  isLastItem: boolean;
  ItemSeparatorComponent?: ComponentType | null;
  onItemSizeChange?: (index: number, size: number, crossSize: number) => void;
  onSeparatorLayout?: (size: number) => void;
  cellKey: string;
  onNodeRef?: (key: string, node: LightningElement | null) => void;
}

const VirtualListCellInner = <T,>({
  mainOffset,
  crossOffset,
  renderItem,
  item,
  index,
  extraData,
  horizontal,
  numColumns,
  itemSize,
  cellCrossSize,
  isLastItem,
  ItemSeparatorComponent,
  onItemSizeChange,
  onSeparatorLayout,
  cellKey,
  onNodeRef,
}: VirtualListCellProps<T>): ReactElement => {
  const outerRef = useRef<LightningElement>(null);

  useLayoutEffect(() => {
    if (outerRef.current) {
      onNodeRef?.(cellKey, outerRef.current);
    }

    return () => {
      onNodeRef?.(cellKey, null);
    };
  }, [cellKey, onNodeRef]);

  const contentSizeRef = useRef({ w: 0, h: 0 });
  const prevIndexRef = useRef(index);

  useEffect(() => {
    if (prevIndexRef.current !== index) {
      const { w, h } = contentSizeRef.current;

      prevIndexRef.current = index;

      if (w > 0 || h > 0) {
        const size = horizontal ? w : h;
        const crossSize = horizontal ? h : w;

        onItemSizeChange?.(index, size, crossSize);
      }
    }
  });

  const handleContentLayout = (event: { w: number; h: number }) => {
    const size = horizontal ? event.w : event.h;
    const crossSize = horizontal ? event.h : event.w;

    contentSizeRef.current = event;

    onItemSizeChange?.(index, size, crossSize);
  };

  const crossAxisSeparator = numColumns > 1;

  const handleSeparatorLayout = (event: { w: number; h: number }) => {
    const alongX = crossAxisSeparator ? !horizontal : horizontal;
    const size = alongX ? event.w : event.h;

    onSeparatorLayout?.(size);
  };

  const separatorPosition: { x: number } | { y: number } = crossAxisSeparator
    ? horizontal
      ? { y: cellCrossSize }
      : { x: cellCrossSize }
    : horizontal
      ? { x: itemSize }
      : { y: itemSize };

  const cellStyle: LightningViewElementStyle = {
    position: 'absolute',
    x: horizontal ? mainOffset : crossOffset,
    y: horizontal ? crossOffset : mainOffset,
    w: horizontal ? undefined : cellCrossSize,
    h: horizontal ? cellCrossSize : undefined,
  };

  return (
    <lng-view ref={outerRef} style={cellStyle}>
      <lng-view onLayout={handleContentLayout}>{renderItem({ item, index, extraData })}</lng-view>
      {ItemSeparatorComponent && !isLastItem && (
        <lng-view
          onLayout={handleSeparatorLayout}
          style={{
            position: 'absolute',
            ...separatorPosition,
          }}
        >
          <ItemSeparatorComponent />
        </lng-view>
      )}
    </lng-view>
  );
};

// Ignores mainOffset/crossOffset — positions are applied directly to nodes.
function areCellPropsEqual(
  prev: VirtualListCellProps<unknown>,
  next: VirtualListCellProps<unknown>,
): boolean {
  return (
    prev.renderItem === next.renderItem &&
    prev.item === next.item &&
    prev.index === next.index &&
    prev.extraData === next.extraData &&
    prev.horizontal === next.horizontal &&
    prev.numColumns === next.numColumns &&
    prev.itemSize === next.itemSize &&
    prev.cellCrossSize === next.cellCrossSize &&
    prev.isLastItem === next.isLastItem &&
    prev.ItemSeparatorComponent === next.ItemSeparatorComponent &&
    prev.onItemSizeChange === next.onItemSizeChange &&
    prev.onSeparatorLayout === next.onSeparatorLayout &&
    prev.cellKey === next.cellKey &&
    prev.onNodeRef === next.onNodeRef
  );
}

export const VirtualListCell = memo(VirtualListCellInner, areCellPropsEqual) as <T>(
  props: VirtualListCellProps<T>,
) => ReactElement;

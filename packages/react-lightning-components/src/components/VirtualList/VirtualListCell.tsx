import type { ComponentType, ReactElement } from 'react';
import { memo, useLayoutEffect, useRef } from 'react';

import type { LightningElement, LightningViewElementStyle } from '@plextv/react-lightning';
import { FocusGroup, useFocusManager } from '@plextv/react-lightning';
import { FlexRoot } from '@plextv/react-lightning-plugin-flexbox';

import { CellBoundsContext, VLCellKeyContext } from './VirtualListContext';
import type { VirtualListRenderItemInfo } from './VirtualListTypes';

export interface VirtualListCellProps<T> {
  mainOffset: number;
  crossOffset: number;
  size: number;
  crossSize: number;
  renderItem: (info: VirtualListRenderItemInfo<T>) => ReactElement;
  item: T;
  index: number;
  /** Stable identity from VL's keyExtractor; keys measurements and provides VLCellKeyContext to descendants. */
  userKey: string;
  shouldFocus: boolean;
  extraData?: unknown;
  horizontal: boolean;
  isLastItem: boolean;
  ItemSeparatorComponent?: ComponentType | null;
  /** True when a flex ancestor exists; cells wrap in FlexRoot for layout + measurement. False means pinned/silent. */
  isInFlex: boolean;
  onItemSizeChange?: (userKey: string, size: number) => void;
  /** Distinct from `onItemSizeChange(_, 0)` (rejected) — this is the explicit empty-row path. */
  onItemEmpty?: (userKey: string) => void;
  onContentCrossLayout?: (size: number) => void;
  onSeparatorLayout?: (size: number) => void;
  /** Mounted offscreen for state preservation; outer FG is disabled so spatial nav skips it. */
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
  const cellElementRef = useRef<LightningElement>(null);
  const prevShouldFocusRef = useRef(shouldFocus);
  const focusManager = useFocusManager();

  const renderedItem = renderItem({ item, index, extraData, shouldFocus });
  const isEmpty = renderedItem == null;

  // Imperative focus claim on shouldFocus false → true. Mount-time claims
  // go through FocusGroup's autoFocus → useFocus.addElement instead.
  //
  // Use `setFocusedChild`, NOT `focusManager.focus()` or
  // `cellElementRef.current.focus()`. The recycle-restore path runs while
  // the user is focused on a different row; `focus()` would yank focus
  // across rows via `_recalculateFocusPath`, and the element's own
  // `.focus()` only flips `_focused` without updating the parent's
  // focusedElement so the next traversal lands on a stale sibling.
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

  // Collapse the row to zero in LM when renderItem returns null.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- onItemEmpty omitted: captures
  // only stable values (lazy-init LM, stable setters); compiler doesn't memoize VL's cell
  // handlers (they live after pool.reconcile), so including the dep would re-fire on every
  // VL render with no behavior change.
  useLayoutEffect(() => {
    if (isEmpty && onItemEmpty) {
      onItemEmpty(userKey);
    }
  }, [isEmpty, userKey]);

  // One-shot push on userKey change for the same-size-recycle case:
  // NodeResizeObserver stays silent when content lays out at the previous
  // occupant's size, but LM still needs the new userKey's measurement.
  // RAF defers past yoga's layout pass so node.w/h are post-render.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- onItemSizeChange/onContentCrossLayout
  // omitted: see the previous effect for the rationale.
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

  const separatorPosition: { x: number } | { y: number } = horizontal ? { x: size } : { y: size };

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

  // FlexRoot is unpinned on both axes so yoga shrinks-to-fit content;
  // pinning the cross axis would create a cell→VL→cell feedback loop.
  // Tradeoff: cross-axis percentages (`width: '100%'` in a vertical VL
  // cell) need the caller to set `style.h`/`.w` on the VL.
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
      <lng-view style={{ position: 'absolute', ...separatorPosition }}>{separatorContent}</lng-view>
    );
  }

  return (
    <FocusGroup ref={cellElementRef} style={cellStyle} autoFocus={shouldFocus} disable={pooled}>
      {measuredContent}
      {separatorEl}
    </FocusGroup>
  );
};

function areCellPropsEqual(
  prev: VirtualListCellProps<unknown>,
  next: VirtualListCellProps<unknown>,
): boolean {
  // The four `on*` callbacks are intentionally skipped — React Compiler
  // doesn't memoize them in VL (they sit after pool.reconcile, the
  // optimization boundary), and they capture only stable values, so a
  // "stale" reference is identical to a fresh one. Comparing identity
  // would re-render every cell on every VL render.
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

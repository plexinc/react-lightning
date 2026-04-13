import { type RefObject, useEffect, useRef, useState } from 'react';

import type { LightningElement } from '@plextv/react-lightning';

import type { LayoutManager } from './LayoutManager';
import type { ScrollEvent } from './VirtualListTypes';

export interface UseScrollHandlerOptions {
  layoutManager: LayoutManager<unknown>;
  horizontal: boolean;
  viewportSize: number;
  drawDistance: number;
  /** Offset from the top of the content container to the first item. */
  itemAreaOffset: number;
  /** Total size of the scrollable content (including padding, header, footer). */
  totalContentSize: number;
  /** Cross-axis viewport size (height for horizontal, width for vertical). */
  viewportCrossSize: number;
  /** Cross-axis content size. */
  totalCrossSize: number;
  animationDuration: number;
  snapToAlignment: 'start' | 'center' | 'end';
  onScroll?: (event: ScrollEvent) => void;
  onEndReached?: () => void;
  onEndReachedThreshold: number;
  /** Called when a scroll animation finishes. */
  onAnimationEnd?: () => void;
  /** Called before a scroll begins (e.g. to flush deferred measurements). */
  onBeforeScroll?: () => void;
  /** Main-axis start padding (acts as scroll margin). */
  paddingStart: number;
  /** Main-axis end padding (acts as scroll margin). */
  paddingEnd: number;
}

export function useScrollHandler(options: UseScrollHandlerOptions): {
  contentRef: RefObject<LightningElement | null>;
  scrollOffsetRef: RefObject<number>;
  animatingRef: RefObject<boolean>;
  maxScroll: number;
  computeVisibleRange: () => {
    startIndex: number;
    endIndex: number;
  };
  scrollToOffset: (offset: number, animated?: boolean) => void;
  scrollToIndex: (
    index: number,
    animated?: boolean,
    viewPosition?: number,
    viewOffset?: number,
  ) => void;
  scrollToEnd: (animated?: boolean) => void;
  handleChildFocused: (child: LightningElement) => void;
} {
  const {
    layoutManager,
    horizontal,
    viewportSize,
    drawDistance,
    itemAreaOffset,
    totalContentSize,
    viewportCrossSize,
    totalCrossSize,
    animationDuration,
    snapToAlignment,
    onScroll,
    onEndReached,
    onEndReachedThreshold,
    onAnimationEnd,
    onBeforeScroll,
    paddingStart,
    paddingEnd,
  } = options;

  const contentRef = useRef<LightningElement>(null);
  const scrollOffsetRef = useRef(0);
  const endReachedRef = useRef(false);
  const lastRangeRef = useRef({ startIndex: 0, endIndex: -1 });
  const animatingRef = useRef(false);
  const animationIdRef = useRef(0);
  const onAnimationEndRef = useRef(onAnimationEnd);
  const onBeforeScrollRef = useRef(onBeforeScroll);
  const [, setScrollVersion] = useState(0);

  useEffect(() => {
    onAnimationEndRef.current = onAnimationEnd;
    onBeforeScrollRef.current = onBeforeScroll;
  });

  const maxScroll = Math.max(0, totalContentSize - viewportSize);

  function clamp(value: number): number {
    return Math.max(0, Math.min(value, maxScroll));
  }

  function applyPosition(offset: number, animated: boolean): void {
    const el = contentRef.current;

    if (!el) {
      return;
    }

    const value = -offset;

    if (animated && animationDuration > 0) {
      animatingRef.current = true;

      const thisAnimId = ++animationIdRef.current;
      const anim = horizontal
        ? el.node.animate({ x: value }, { duration: animationDuration, easing: 'ease-out' })
        : el.node.animate({ y: value }, { duration: animationDuration, easing: 'ease-out' });

      anim.once('stopped', () => {
        if (animationIdRef.current !== thisAnimId) {
          return;
        }

        animatingRef.current = false;

        // Pin the position so reconciliation doesn't reset it
        if (horizontal) {
          el.node.x = value;
        } else {
          el.node.y = value;
        }

        onAnimationEndRef.current?.();
      });

      anim.start();
    } else {
      animatingRef.current = false;

      if (horizontal) {
        el.node.x = value;
      } else {
        el.node.y = value;
      }
    }
  }

  function computeVisibleRange() {
    const scrollInItemSpace = Math.max(0, scrollOffsetRef.current - itemAreaOffset);

    return layoutManager.getVisibleRange(scrollInItemSpace, viewportSize, drawDistance);
  }

  function checkRangeChanged(): void {
    const range = computeVisibleRange();
    const last = lastRangeRef.current;

    if (range.startIndex !== last.startIndex || range.endIndex !== last.endIndex) {
      lastRangeRef.current = range;
      setScrollVersion((v) => v + 1);
    }
  }

  function scrollToOffset(offset: number, animated = true): void {
    onBeforeScrollRef.current?.();

    const clamped = clamp(offset);

    scrollOffsetRef.current = clamped;

    applyPosition(clamped, animated);
    checkRangeChanged();

    if (onEndReached) {
      const distFromEnd = totalContentSize - clamped - viewportSize;

      if (distFromEnd <= viewportSize * onEndReachedThreshold) {
        if (!endReachedRef.current) {
          endReachedRef.current = true;
          onEndReached();
        }
      } else {
        endReachedRef.current = false;
      }
    }

    onScroll?.({
      contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
      contentOffset: horizontal ? { x: clamped, y: 0 } : { x: 0, y: clamped },
      contentSize: horizontal
        ? { width: totalContentSize, height: totalCrossSize }
        : { width: totalCrossSize, height: totalContentSize },
      layoutMeasurement: horizontal
        ? { width: viewportSize, height: viewportCrossSize }
        : { width: viewportCrossSize, height: viewportSize },
    });
  }

  function scrollToIndex(index: number, animated = true, viewPosition = 0, viewOffset = 0): void {
    const layout = layoutManager.getLayout(index);

    if (!layout) {
      return;
    }

    const absOffset = itemAreaOffset + layout.offset;
    const target = absOffset - viewPosition * (viewportSize - layout.size) + viewOffset;

    scrollToOffset(target, animated);
  }

  function scrollToEnd(animated = true): void {
    scrollToOffset(maxScroll, animated);
  }

  function handleChildFocused(child: LightningElement): void {
    const el = contentRef.current;

    if (!el) {
      return;
    }

    const pos = child.getRelativePosition(el);
    const childOffset = horizontal ? pos.x : pos.y;
    const childSize = horizontal ? child.node.w : child.node.h;

    let target: number;

    switch (snapToAlignment) {
      case 'center':
        target = childOffset + childSize / 2 - viewportSize / 2;
        break;
      case 'end':
        target = childOffset + childSize - viewportSize + paddingEnd;
        break;
      default:
        target = childOffset - paddingStart;
        break;
    }

    // Snap to edges to keep header/footer visible when near them
    const footerAreaSize = totalContentSize - itemAreaOffset - layoutManager.totalSize;

    if (target > 0 && target <= itemAreaOffset) {
      target = 0;
    } else if (target < maxScroll && target >= maxScroll - footerAreaSize) {
      target = maxScroll;
    }

    scrollToOffset(target, true);
  }

  return {
    contentRef,
    scrollOffsetRef,
    animatingRef,
    maxScroll,
    computeVisibleRange,
    scrollToOffset,
    scrollToIndex,
    scrollToEnd,
    handleChildFocused,
  };
}

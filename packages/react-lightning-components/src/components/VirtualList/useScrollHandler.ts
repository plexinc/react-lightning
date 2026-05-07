import { type RefObject, useEffect, useRef, useState } from 'react';

import type { LightningElement } from '@plextv/react-lightning';

import type { LayoutManager } from './LayoutManager';
import type { ScrollEvent } from './VirtualListTypes';

export interface UseScrollHandlerOptions {
  layoutManager: LayoutManager<unknown>;
  horizontal: boolean | null;
  viewportSize: number;
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
  onEndReached?: ((info: { distanceFromEnd: number }) => void) | null;
  onEndReachedThreshold: number | null;
  /** Main-axis start padding (acts as scroll margin). */
  paddingStart: number;
  /** Main-axis end padding (acts as scroll margin). */
  paddingEnd: number;
  initialScrollOffset?: number;
  /** Fires once when an animated scroll begins; VL flips LM into batching. */
  onAnimationStart?: () => void;
  /** Fires once when the in-flight animation ends or `resetScroll` cancels it; VL drains the batch. */
  onAnimationEnd?: () => void;
}

export interface UseScrollHandlerResult {
  contentRef: RefObject<LightningElement | null>;
  /** Live scroll offset — updated on every scroll, including mid-animation. */
  scrollOffsetRef: RefObject<number>;
  /** Last scroll offset at which the visible range changed — safe to read during render. */
  committedScrollOffset: number;
  maxScroll: number;
  scrollToOffset: (offset: number, animated?: boolean) => void;
  scrollToIndex: (
    index: number,
    animated?: boolean,
    viewPosition?: number,
    viewOffset?: number,
  ) => void;
  scrollToEnd: (animated?: boolean) => void;
  handleChildFocused: (child: LightningElement) => void;
  /** Jump to an offset with no animation or onScroll/onEndReached side-effects (cellKey-restore path). */
  resetScroll: (offset: number) => void;
}

export function useScrollHandler(options: UseScrollHandlerOptions): UseScrollHandlerResult {
  const {
    layoutManager,
    horizontal,
    viewportSize,
    itemAreaOffset,
    totalContentSize,
    viewportCrossSize,
    totalCrossSize,
    animationDuration,
    snapToAlignment,
    onScroll,
    onEndReached,
    onEndReachedThreshold,
    paddingStart,
    paddingEnd,
    initialScrollOffset = 0,
    onAnimationStart,
    onAnimationEnd,
  } = options;

  const contentRef = useRef<LightningElement>(null);
  const scrollOffsetRef = useRef(initialScrollOffset);
  const endReachedRef = useRef(false);
  const animationIdRef = useRef(0);
  // True from the moment an animated scroll begins until the final
  // `stopped` event fires (or `resetScroll` cancels). Guards both ends
  // of the start/end notification so chained animations only fire one
  // start and one end overall.
  const isAnimatingRef = useRef(false);
  const [committedScrollOffset, setCommittedScrollOffset] = useState(initialScrollOffset);

  // Pin restored scroll offset to node.x/y on mount so first paint matches
  // committedScrollOffset (which useState already initialized).
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- mount-only restore
  useEffect(() => {
    if (initialScrollOffset > 0 && contentRef.current) {
      const value = -initialScrollOffset;

      if (horizontal) {
        contentRef.current.node.x = value;
      } else {
        contentRef.current.node.y = value;
      }
    }
  }, []);

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
      const thisAnimId = ++animationIdRef.current;

      if (!isAnimatingRef.current) {
        isAnimatingRef.current = true;
        onAnimationStart?.();
      }

      const anim = horizontal
        ? el.node.animate({ x: value }, { duration: animationDuration, easing: 'ease-out' })
        : el.node.animate({ y: value }, { duration: animationDuration, easing: 'ease-out' });

      anim.once('stopped', () => {
        if (animationIdRef.current !== thisAnimId) {
          return;
        }

        // Pin the position so reconciliation doesn't reset it
        if (horizontal) {
          el.node.x = value;
        } else {
          el.node.y = value;
        }

        isAnimatingRef.current = false;
        onAnimationEnd?.();
      });

      anim.start();
    } else {
      if (horizontal) {
        el.node.x = value;
      } else {
        el.node.y = value;
      }
    }
  }

  function scrollToOffset(offset: number, animated = true): void {
    const clamped = clamp(offset);

    scrollOffsetRef.current = clamped;

    applyPosition(clamped, animated);
    // Commit unconditionally — drives contentStyle.x on the post-animation
    // render and the parent's cache write. Same-value setState is free.
    setCommittedScrollOffset(clamped);

    if (onEndReached) {
      const distanceFromEnd = totalContentSize - clamped - viewportSize;

      if (distanceFromEnd <= viewportSize * (onEndReachedThreshold ?? 0.5)) {
        if (!endReachedRef.current) {
          endReachedRef.current = true;
          onEndReached({ distanceFromEnd });
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

  function resetScroll(offset: number): void {
    scrollOffsetRef.current = offset;
    setCommittedScrollOffset(offset);

    // Cancel any in-flight scroll animation so it doesn't snap back.
    animationIdRef.current++;

    if (isAnimatingRef.current) {
      isAnimatingRef.current = false;
      onAnimationEnd?.();
    }

    // Apply directly to lightning so the next paint reflects the new
    // scroll without waiting for React's reconciliation to flush.
    const el = contentRef.current;

    if (el) {
      const value = -offset;

      if (horizontal) {
        el.node.x = value;
      } else {
        el.node.y = value;
      }
    }
  }

  return {
    contentRef,
    scrollOffsetRef,
    committedScrollOffset,
    maxScroll,
    scrollToOffset,
    scrollToIndex,
    scrollToEnd,
    handleChildFocused,
    resetScroll,
  };
}

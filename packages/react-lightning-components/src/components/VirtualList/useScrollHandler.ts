import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { LightningElement } from '@plextv/react-lightning';

import { createMomentumTracker } from './createMomentumTracker';
import type { LayoutManager } from './LayoutManager';
import { reconcileScrollBounds } from './reconcileScrollBounds';
import { resolveChildSnapTarget } from './resolveChildSnapAlignment';
import { type FocusAnchor, resolveFocusResnapScroll } from './resolveFocusResnap';
import { resolveFocusScrollTarget } from './resolveFocusScrollTarget';
import { resolveScrollIntentRescroll } from './resolveScrollIntentRescroll';
import { resolveScrollToIndexTarget } from './resolveScrollToIndexTarget';
import { createCriticalSpring } from './scrollSpring';
import type { ScrollEvent } from './VirtualListTypes';

// Lightning Magic Remote / mouse support (in the host app) installs this hook
// while a pointer is driving focus. Read it off globalThis so this subtree stays
// free of app imports; undefined (a no-op) on every platform that never loads it.
const isPointerFocusScrollSuppressed = (): boolean => {
  const fn = (globalThis as { __plexShouldSuppressPointerFocusScroll?: () => boolean })
    .__plexShouldSuppressPointerFocusScroll;

  return typeof fn === 'function' && fn();
};

// Lightning mirror of the tvOS scroll spring (app sets dampingRatio 1,
// initialSpringVelocity 0.25 via initializeScrollTransition). Frequency is fit
// to Apple TV sim screen recordings, not the config's nominal 0.6s: UIKit's
// damped spring settles ~1.5x faster than that nominal implies. Measured
// effective omega ~0.0148/ms vertical, ~0.0160 horizontal (critical-spring fit
// RMS < 0.012); 410ms nominal = 2pi/omega sits between.
const SPRING_OMEGA = (2 * Math.PI) / 410;
const SPRING_INITIAL_VELOCITY = 0.25;
// Let the spring settle naturally (like UIKit) and snap only once it's within
// half a pixel of the target: a fixed-time cutoff leaves ~1% of the distance
// and snapping that gap reads as a small bounce at the end. Cap the tail so a
// stalled frame clock still terminates.
const SPRING_SETTLE_PX = 0.5;
const SPRING_MAX_DURATION_MS = 1200;

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
  snapToAlignment: 'start' | 'center' | 'end' | 'item';
  /** List-level snap padding for focus snaps (react-native-tvos parity). */
  snapToItemPadding?: number;
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
  /** Momentum-scroll parity: begin once when a focus-driven scroll animates. */
  onMomentumScrollBegin?: (event: ScrollEvent) => void;
  /** Momentum-scroll parity: end once when the animated scroll settles or is cancelled. */
  onMomentumScrollEnd?: (event: ScrollEvent) => void;
  itemCount: number;
  keepFocusedItemSnapped: boolean;
  shouldSuppressFocusScroll?: () => boolean;
}

type HeldScroll =
  | { kind: 'index'; index: number; animated?: boolean; viewPosition?: number; viewOffset?: number }
  | { kind: 'end'; animated?: boolean };

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
  handleChildFocused: (child: LightningElement, index: number) => void;
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
    snapToItemPadding,
    onScroll,
    onEndReached,
    onEndReachedThreshold,
    paddingStart,
    paddingEnd,
    initialScrollOffset = 0,
    onAnimationStart,
    onAnimationEnd,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
    itemCount,
    keepFocusedItemSnapped,
    shouldSuppressFocusScroll,
  } = options;

  const isFocusScrollSuppressed = (): boolean =>
    isPointerFocusScrollSuppressed() || shouldSuppressFocusScroll?.() === true;

  // Not a ref: passing one to a function in render makes the React Compiler skip the hook.
  const [momentum] = useState(() => createMomentumTracker({ current: {} }));

  useEffect(() => {
    momentum.setCallbacks({ onMomentumScrollBegin, onMomentumScrollEnd });
  }, [momentum, onMomentumScrollBegin, onMomentumScrollEnd]);

  const contentRef = useRef<LightningElement>(null);
  const scrollOffsetRef = useRef(initialScrollOffset);
  const endReachedForCountRef = useRef(0);
  const heldScrollRef = useRef<HeldScroll | null>(null);
  const focusAnchorRef = useRef<FocusAnchor | null>(null);
  const indexIntentRef = useRef<number | null>(null);
  const animationIdRef = useRef(0);
  // True from the moment an animated scroll begins until the animation loop
  // completes (or `resetScroll` cancels). Guards both ends of the start/end
  // notification so chained animations only fire one start and one end overall.
  const isAnimatingRef = useRef(false);
  // rAF id of the in-flight scroll animation loop; non-zero while animating.
  const scrollRafRef = useRef(0);
  // Live velocity of the in-flight animation (px/ms, signed); feeds the
  // momentum curve when a scroll is retargeted mid-flight.
  const scrollVelocityRef = useRef(0);
  // Target of the in-flight animated scroll, so a duplicate request for the
  // same target doesn't restart the spring (and re-inject velocity).
  const animTargetRef = useRef<number | null>(null);
  const lastTickRef = useRef<{ pos: number; time: number } | null>(null);
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

  // oxlint-disable-next-line react-hooks/exhaustive-deps -- unmount-only cleanup
  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const maxScroll = Math.max(0, totalContentSize - viewportSize);

  function clamp(value: number): number {
    return Math.max(0, Math.min(value, maxScroll));
  }

  function makeScrollEvent(offset: number): ScrollEvent {
    return {
      contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
      contentOffset: horizontal ? { x: offset, y: 0 } : { x: 0, y: offset },
      contentSize: horizontal
        ? { width: totalContentSize, height: totalCrossSize }
        : { width: totalCrossSize, height: totalContentSize },
      layoutMeasurement: horizontal
        ? { width: viewportSize, height: viewportCrossSize }
        : { width: viewportCrossSize, height: viewportSize },
    };
  }

  function applyPosition(offset: number, animated: boolean): void {
    const el = contentRef.current;

    if (!el) {
      return;
    }

    const value = -offset;

    if (animated && animationDuration > 0) {
      const thisAnimId = ++animationIdRef.current;

      const justStarted = !isAnimatingRef.current;

      if (justStarted) {
        isAnimatingRef.current = true;
        onAnimationStart?.();
      }

      // Self-driven animation instead of node.animate: each frame emits
      // onScroll first and then moves the node, so scroll-linked styles land
      // in the same painted frame (sampling the node from a separate loop
      // trailed the rows by a frame). Native lists emit scroll events
      // throughout an animated scroll; scroll-linked effects rely on that.
      const from = -(horizontal ? el.node.x : el.node.y);
      const distance = offset - from;
      const startTime = performance.now();

      animTargetRef.current = offset;

      if (justStarted) {
        momentum.start(makeScrollEvent(clamp(from)));
      }

      // Every animated scroll runs the tvOS spring. A press pumps in the
      // normalized initial velocity on top of whatever the in-flight
      // animation carries (UIKit's additive begin-from-current-state), so
      // chained moves keep their momentum and glide out on the spring tail.
      const v0 = scrollVelocityRef.current + (SPRING_INITIAL_VELOCITY * distance) / 1000;
      const spring = createCriticalSpring(-distance, v0, SPRING_OMEGA);

      lastTickRef.current = { pos: from, time: startTime };

      const tick = (now: number): void => {
        const target = contentRef.current;

        if (animationIdRef.current !== thisAnimId || !target) {
          return;
        }

        const t = now - startTime;
        const pos = spring.position(t);
        const done =
          (Math.abs(pos) < SPRING_SETTLE_PX && Math.abs(spring.velocity(t)) < 0.01) ||
          t >= SPRING_MAX_DURATION_MS;
        const current = done ? offset : offset + pos;

        const last = lastTickRef.current;

        if (last && now > last.time) {
          scrollVelocityRef.current = (current - last.pos) / (now - last.time);
        }

        lastTickRef.current = { pos: current, time: now };

        onScroll?.(makeScrollEvent(clamp(current)));

        if (horizontal) {
          target.node.x = -current;
        } else {
          target.node.y = -current;
        }

        if (!done) {
          scrollRafRef.current = requestAnimationFrame(tick);
        } else {
          scrollRafRef.current = 0;
          scrollVelocityRef.current = 0;
          animTargetRef.current = null;
          isAnimatingRef.current = false;
          onAnimationEnd?.();
          momentum.settle(makeScrollEvent(clamp(offset)));
        }
      };

      // Retargeting mid-flight restarts the curve from the live position; the
      // stale loop is cancelled so only one drives the node.
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }

      scrollRafRef.current = requestAnimationFrame(tick);
    } else {
      scrollVelocityRef.current = 0;

      if (horizontal) {
        el.node.x = value;
      } else {
        el.node.y = value;
      }
    }
  }

  function scrollTo(offset: number, animated: boolean, isScroll: boolean): void {
    const clamped = clamp(offset);

    // A focus move can fire duplicate scroll requests for the same target; restarting the
    // spring re-injects velocity and shows as a small bounce at the end of the settle.
    if (
      animated &&
      isAnimatingRef.current &&
      animTargetRef.current !== null &&
      Math.abs(clamped - animTargetRef.current) < 1
    ) {
      return;
    }

    scrollOffsetRef.current = clamped;

    applyPosition(clamped, animated);
    // Commit unconditionally — drives contentStyle.x on the post-animation
    // render and the parent's cache write. Same-value setState is free.
    setCommittedScrollOffset(clamped);

    const bounds = reconcileScrollBounds({
      scrollOffset: clamped,
      maxScroll,
      totalContentSize,
      viewportSize,
      onEndReachedThreshold,
      endReachedForCount: endReachedForCountRef.current,
      itemCount,
      isScroll,
      hasEndReachedListener: !!onEndReached,
    });

    endReachedForCountRef.current = bounds.endReachedForCount;

    if (bounds.fireEndReached) {
      onEndReached?.({ distanceFromEnd: bounds.distanceFromEnd });
    }

    // Animated scrolls stream onScroll from the emit loop instead; emitting
    // the target immediately would defeat scroll-linked animations.
    if (!(animated && animationDuration > 0 && contentRef.current)) {
      onScroll?.(makeScrollEvent(clamped));
    }
  }

  function scrollToOffset(offset: number, animated = true): void {
    focusAnchorRef.current = null;
    indexIntentRef.current = null;
    scrollTo(offset, animated, true);
  }

  function scrollToIndex(index: number, animated = true, viewPosition = 0, viewOffset = 0): void {
    const layout = layoutManager.getLayout(index);

    if (!layout) {
      return;
    }

    const target = resolveScrollToIndexTarget({
      itemOffset: itemAreaOffset + layout.offset,
      itemSize: layout.size,
      viewportSize,
      viewPosition,
      viewOffset,
    });

    if (target === undefined) {
      heldScrollRef.current = { kind: 'index', index, animated, viewPosition, viewOffset };

      return;
    }

    scrollToOffset(target, animated);
    indexIntentRef.current = target;
  }

  function scrollToEnd(animated = true): void {
    if (viewportSize <= 0) {
      heldScrollRef.current = { kind: 'end', animated };

      return;
    }

    scrollToOffset(maxScroll, animated);
  }

  // oxlint-disable-next-line react-hooks/exhaustive-deps -- replays with this render's scroll functions once the viewport lands
  useLayoutEffect(() => {
    const held = heldScrollRef.current;

    if (!held || viewportSize <= 0) {
      return;
    }

    heldScrollRef.current = null;

    if (held.kind === 'end') {
      scrollToEnd(held.animated);
    } else {
      scrollToIndex(held.index, held.animated, held.viewPosition, held.viewOffset);
    }
  }, [viewportSize]);

  function resolveFocusTarget(anchor: FocusAnchor): number {
    return resolveFocusScrollTarget({
      childOffset: anchor.childOffset,
      childSize: anchor.childSize,
      viewportSize,
      snapToAlignment: anchor.align,
      snapOffset: anchor.snapOffset,
      snapToItemPadding,
      paddingStart,
      paddingEnd,
      headerSize: itemAreaOffset - paddingStart,
      footerSize: totalContentSize - itemAreaOffset - layoutManager.totalSize - paddingEnd,
      maxScroll,
    });
  }

  function handleChildFocused(child: LightningElement, index: number): void {
    focusAnchorRef.current = null;
    indexIntentRef.current = null;

    // Pointer hover moves focus; don't scroll to follow it or the row slides out
    // from under a stationary cursor and the next click misses.
    if (isFocusScrollSuppressed()) {
      return;
    }

    const el = contentRef.current;

    if (!el) {
      return;
    }

    const pos = child.getRelativePosition(el);
    // A row's own scrollSnapAlign/scrollSnapOffset wins over the list-level alignment,
    // matching react-native-tvos ("item" defers to rows, markerless rows get 'start').
    const childTarget = resolveChildSnapTarget(child);
    const cell = index >= 0 ? layoutManager.getLayout(index) : undefined;
    const anchor: FocusAnchor = {
      index,
      cellOffset: cell ? itemAreaOffset + cell.offset : 0,
      childOffset: horizontal ? pos.x : pos.y,
      childSize: horizontal ? child.node.w : child.node.h,
      align: childTarget?.align ?? (snapToAlignment === 'item' ? 'start' : snapToAlignment),
      snapOffset: childTarget?.offset,
    };

    if (keepFocusedItemSnapped && cell) {
      focusAnchorRef.current = anchor;
    }

    scrollTo(resolveFocusTarget(anchor), true, true);
  }

  useLayoutEffect(() => {
    const anchor = focusAnchorRef.current;

    if (!anchor || isFocusScrollSuppressed()) {
      return;
    }

    const cell = layoutManager.getLayout(anchor.index);

    if (!cell) {
      focusAnchorRef.current = null;

      return;
    }

    const resnap = resolveFocusResnapScroll(
      anchor,
      itemAreaOffset + cell.offset,
      scrollOffsetRef.current,
      (next) => clamp(resolveFocusTarget(next)),
    );

    if (resnap) {
      focusAnchorRef.current = resnap.anchor;
      scrollTo(resnap.target, true, false);
    }
  });

  // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed on the range the clamp depends on
  useLayoutEffect(() => {
    const target = resolveScrollIntentRescroll(
      indexIntentRef.current,
      scrollOffsetRef.current,
      maxScroll,
    );

    if (target !== undefined) {
      scrollTo(target, false, false);
    }
  }, [maxScroll]);

  function resetScroll(offset: number): void {
    focusAnchorRef.current = null;
    indexIntentRef.current = null;
    heldScrollRef.current = null;
    scrollOffsetRef.current = offset;
    setCommittedScrollOffset(offset);

    // Cancel any in-flight scroll animation so it doesn't snap back.
    animationIdRef.current++;

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = 0;
    }

    scrollVelocityRef.current = 0;
    animTargetRef.current = null;

    if (isAnimatingRef.current) {
      isAnimatingRef.current = false;
      onAnimationEnd?.();
      momentum.cancel(makeScrollEvent(offset));
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

  // Native ScrollView/FlashList reconcile the offset against the content size on
  // every layout pass; react-lightning only did it inside the scroll handler. When
  // content shrinks below the current offset the list was left scrolled past the
  // new end (blank canvas until the next scroll); a short list already within the
  // threshold never primed onEndReached on mount. Re-run the decision whenever the
  // size axes change.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed on the size axes; maxScroll derives from them
  useEffect(() => {
    const bounds = reconcileScrollBounds({
      scrollOffset: scrollOffsetRef.current,
      maxScroll,
      totalContentSize,
      viewportSize,
      onEndReachedThreshold,
      endReachedForCount: endReachedForCountRef.current,
      itemCount,
      isScroll: false,
      hasEndReachedListener: !!onEndReached,
    });

    if (bounds.didClamp) {
      scrollOffsetRef.current = bounds.clampedOffset;
      setCommittedScrollOffset(bounds.clampedOffset);
      applyPosition(bounds.clampedOffset, false);
      onScroll?.(makeScrollEvent(bounds.clampedOffset));
    }

    endReachedForCountRef.current = bounds.endReachedForCount;

    if (bounds.fireEndReached) {
      onEndReached?.({ distanceFromEnd: bounds.distanceFromEnd });
    }
  }, [totalContentSize, viewportSize, itemCount]);

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

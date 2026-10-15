import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LightningElement } from '@plextv/react-lightning';

import { createTestRenderer } from './createTestRenderer';
import type { LayoutManager } from './LayoutManager';
import { type UseScrollHandlerResult, useScrollHandler } from './useScrollHandler';

const ROW = 100;
const COUNT = 20;
const VIEWPORT = 300;

function setup() {
  const { render } = createTestRenderer();
  const sizes = Array.from({ length: COUNT }, () => ROW);
  const offsetOf = (index: number) => sizes.slice(0, index).reduce((sum, size) => sum + size, 0);
  const totalSize = () => offsetOf(COUNT);
  const layoutManager = {
    getLayout: (index: number) => ({
      offset: offsetOf(index),
      size: sizes[index],
      column: 0,
      crossOffset: 0,
      crossSize: 500,
    }),
    get totalSize() {
      return totalSize();
    },
  } as unknown as LayoutManager<unknown>;
  let current: UseScrollHandlerResult | undefined;

  function Probe({ total }: { total: number }) {
    current = useScrollHandler({
      layoutManager,
      horizontal: false,
      viewportSize: VIEWPORT,
      itemAreaOffset: 0,
      totalContentSize: total,
      viewportCrossSize: 500,
      totalCrossSize: 500,
      animationDuration: 300,
      snapToAlignment: 'start',
      onEndReachedThreshold: null,
      paddingStart: 0,
      paddingEnd: 0,
      itemCount: COUNT,
      keepFocusedItemSnapped: true,
    });

    return null;
  }

  const rerender = () => render(<Probe total={totalSize()} />);

  rerender();

  // oxlint-disable-next-line typescript/no-non-null-assertion -- set by the first render
  const handler = () => current!;

  handler().contentRef.current = { node: { x: 0, y: 0 } } as unknown as LightningElement;

  const focus = (index: number) => {
    const child = {
      getRelativePosition: () => ({ x: 0, y: offsetOf(index) }),
      node: { w: 500, h: sizes[index] },
      props: {},
      children: [],
    } as unknown as LightningElement;

    handler().handleChildFocused(child, index);
    rerender();
  };

  const resize = (index: number, size: number) => {
    sizes[index] = size;
    rerender();
  };

  return { handler, focus, resize, rerender };
}

describe('useScrollHandler', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the focused row snapped when a scrollToIndex echoes the focus scroll', () => {
    const { handler, focus, resize } = setup();

    focus(10);
    handler().scrollToIndex(10, true);
    resize(5, 76);

    expect(handler().scrollOffsetRef.current).toBe(976);
  });

  it('lets a scroll to another row release the focused row', () => {
    const { handler, focus, resize } = setup();

    focus(10);
    handler().scrollToIndex(12, true);
    resize(5, 76);

    expect(handler().scrollOffsetRef.current).toBe(1200);
  });
});

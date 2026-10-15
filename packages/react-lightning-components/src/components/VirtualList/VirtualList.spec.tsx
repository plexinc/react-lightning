import { type ReactNode, useLayoutEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@plextv/react-lightning', () => ({
  FocusGroup: ({ children }: { children?: ReactNode }) => children,
  useFocusManager: () => ({ setFocusedChild: () => {} }),
}));

vi.mock('@plextv/react-lightning-plugin-flexbox', () => ({
  FlexBoundary: ({ children }: { children?: ReactNode }) => children,
  FlexRoot: ({ children }: { children?: ReactNode }) => children,
  useIsInFlex: () => false,
  onFlexLayoutSettled: () => () => {},
}));

import { createTestRenderer } from './createTestRenderer';
import { VirtualList } from './VirtualList';
import type { ItemLayout, VirtualListRef } from './VirtualListTypes';

type Read = {
  index: number;
  hasHandle: boolean;
  range?: { startIndex: number; endIndex: number };
  layout?: ItemLayout;
};

describe('VirtualList', () => {
  it('keeps the ref attached while cells run layout effects after a scroll', () => {
    const { render, flush } = createTestRenderer();
    const listRef: { current: VirtualListRef | null } = { current: null };
    const reads: Read[] = [];

    function Cell({ index }: { index: number }) {
      useLayoutEffect(() => {
        const handle = listRef.current;

        reads.push({
          index,
          hasHandle: handle != null,
          range: handle?.getVisibleRange(),
          layout: handle?.getLayout(index),
        });
      }, [index]);

      return null;
    }

    render(
      <VirtualList
        ref={listRef}
        data={Array.from({ length: 50 }, (_, i) => i)}
        drawDistance={0}
        overrideItemLayout={(layout) => {
          layout.size = 100;
        }}
        renderItem={({ index }) => <Cell index={index} />}
        style={{ w: 500, h: 300 }}
      />,
    );

    reads.length = 0;
    listRef.current?.scrollToOffset({ offset: 2000, animated: false });
    flush();

    expect(reads.length).toBeGreaterThan(0);

    for (const read of reads) {
      expect(read.hasHandle).toBe(true);
      expect(read.range?.startIndex).toBe(20);
      expect(read.layout?.y).toBe(read.index * 100);
    }
  });
});

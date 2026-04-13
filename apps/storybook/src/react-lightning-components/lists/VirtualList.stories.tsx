import type { Meta } from '@storybook/react-vite';
import { useRef, useState } from 'react';

import { focusable } from '@plextv/react-lightning';
import VirtualList from '@plextv/react-lightning-components/lists/VirtualList';
import type { VirtualListRef } from '@plextv/react-lightning-components/lists/VirtualList';

import type { ScrollItemProps } from '../../components/ScrollItem';
import ScrollItem from '../../components/ScrollItem';

export default {
  title: 'react-lightning-components/Lists/VirtualList',
  component: VirtualList,
} as Meta<typeof VirtualList>;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const makeItems = (count: number) => Array.from({ length: count }, (_, i) => `Item ${i}`);

const COLORS = {
  teal: 0x4fafafff,
  tealAlt: 0xafaf4fff,
  yellow: 0xafaf4fff,
  yellowAlt: 0xaf4fafff,
  purple: 0x9f5fdfff,
  purpleAlt: 0xdf5f9fff,
  dark: 0x333333ff,
  mid: 0x555555ff,
  bg: 0x111111ff,
};

const Label = ({ text, w = 500, h = 30 }: { text: string; w?: number; h?: number }) => (
  <lng-view style={{ w, h, color: COLORS.dark }}>
    <lng-text style={{ fontSize: 16, color: 0xffffffff, x: 8, y: 6 }}>{text}</lng-text>
  </lng-view>
);

// ---------------------------------------------------------------------------
// Vertical — The simplest possible list.
// ---------------------------------------------------------------------------

export const Vertical = () => (
  <VirtualList
    data={makeItems(100)}
    estimatedItemSize={50}
    style={{ w: 500, h: 500 }}
    renderItem={({ index, item }) => (
      <ScrollItem
        color={COLORS.teal}
        altColor={COLORS.tealAlt}
        index={index}
        width={500}
        height={50}
      >
        {item}
      </ScrollItem>
    )}
  />
);

// ---------------------------------------------------------------------------
// Horizontal — Scrolling along the x-axis.
// ---------------------------------------------------------------------------

export const Horizontal = () => (
  <VirtualList
    data={makeItems(100)}
    horizontal
    estimatedItemSize={120}
    style={{ w: 800, h: 150 }}
    renderItem={({ index, item }) => (
      <ScrollItem
        horizontal
        color={COLORS.yellow}
        altColor={COLORS.yellowAlt}
        index={index}
        width={120}
        height={150}
      >
        {item}
      </ScrollItem>
    )}
  />
);

// ---------------------------------------------------------------------------
// Grid — Multi-column layout using numColumns.
// ---------------------------------------------------------------------------

export const Grid = () => (
  <VirtualList
    data={makeItems(60)}
    numColumns={3}
    estimatedItemSize={100}
    style={{ w: 600, h: 500 }}
    renderItem={({ index, item }) => (
      <ScrollItem
        color={COLORS.purple}
        altColor={COLORS.purpleAlt}
        index={index}
        width={200}
        height={100}
      >
        {item}
      </ScrollItem>
    )}
  />
);

// ---------------------------------------------------------------------------
// HeaderFooterSeparator — ListHeaderComponent, ListFooterComponent,
// and ItemSeparatorComponent slots.
// ---------------------------------------------------------------------------

const HeaderBanner = () => <Label text="Header" w={500} h={40} />;
const FooterBanner = () => <Label text="End of list" w={500} h={60} />;
const ItemDivider = () => <lng-view style={{ w: 500, h: 4, color: COLORS.mid }} />;

export const HeaderFooterSeparator = () => (
  <VirtualList
    data={makeItems(30)}
    estimatedItemSize={50}
    style={{ w: 500, h: 500 }}
    ListHeaderComponent={HeaderBanner}
    listHeaderSize={40}
    ListFooterComponent={FooterBanner}
    listFooterSize={60}
    ItemSeparatorComponent={ItemDivider}
    renderItem={({ index, item }) => (
      <ScrollItem
        color={COLORS.teal}
        altColor={COLORS.tealAlt}
        index={index}
        width={500}
        height={50}
      >
        {item}
      </ScrollItem>
    )}
  />
);

// ---------------------------------------------------------------------------
// EmptyList — Rendered when data is an empty array.
// ---------------------------------------------------------------------------

const EmptyState = () => (
  <lng-view
    style={{ w: 500, h: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
  >
    <lng-text style={{ fontSize: 24, color: 0x999999ff }}>Nothing here yet</lng-text>
  </lng-view>
);

export const EmptyList = () => (
  <VirtualList
    data={[]}
    estimatedItemSize={50}
    style={{ w: 500, h: 300, color: COLORS.bg }}
    ListEmptyComponent={EmptyState}
    renderItem={() => <lng-view />}
  />
);

// ---------------------------------------------------------------------------
// ContentPadding — contentContainerStyle with padding and backgroundColor.
// ---------------------------------------------------------------------------

export const ContentPadding = () => (
  <VirtualList
    data={makeItems(40)}
    estimatedItemSize={50}
    style={{ w: 540, h: 500 }}
    contentContainerStyle={{
      padding: 20,
      backgroundColor: 0x1a1a2eff,
    }}
    renderItem={({ index, item }) => (
      <ScrollItem
        color={COLORS.teal}
        altColor={COLORS.tealAlt}
        index={index}
        width={500}
        height={50}
      >
        {item}
      </ScrollItem>
    )}
  />
);

// ---------------------------------------------------------------------------
// SnapAlignment — Controls where focused items align within the viewport.
// Three sub-stories: start (default), center, and end.
// ---------------------------------------------------------------------------

export const SnapStart = () => (
  <VirtualList
    data={makeItems(50)}
    estimatedItemSize={75}
    snapToAlignment="start"
    style={{ w: 500, h: 400 }}
    renderItem={({ index, item }) => (
      <ScrollItem
        color={COLORS.teal}
        altColor={COLORS.tealAlt}
        index={index}
        width={500}
        height={75}
      >
        {item}
      </ScrollItem>
    )}
  />
);

export const SnapCenter = () => (
  <VirtualList
    data={makeItems(50)}
    estimatedItemSize={75}
    snapToAlignment="center"
    style={{ w: 500, h: 400 }}
    renderItem={({ index, item }) => (
      <ScrollItem
        color={COLORS.yellow}
        altColor={COLORS.yellowAlt}
        index={index}
        width={500}
        height={75}
      >
        {item}
      </ScrollItem>
    )}
  />
);

export const SnapEnd = () => (
  <VirtualList
    data={makeItems(50)}
    estimatedItemSize={75}
    snapToAlignment="end"
    style={{ w: 500, h: 400 }}
    renderItem={({ index, item }) => (
      <ScrollItem
        color={COLORS.purple}
        altColor={COLORS.purpleAlt}
        index={index}
        width={500}
        height={75}
      >
        {item}
      </ScrollItem>
    )}
  />
);

// ---------------------------------------------------------------------------
// OverrideItemLayout — Per-item size and span customization. Here every
// third item is taller, and the first item spans 2 columns in a grid.
// ---------------------------------------------------------------------------

export const OverrideItemLayout = () => (
  <VirtualList
    data={makeItems(40)}
    numColumns={3}
    estimatedItemSize={100}
    style={{ w: 600, h: 500 }}
    overrideItemLayout={(layout, _item, index) => {
      if (index === 0) {
        layout.span = 2;
        layout.size = 150;
      } else if (index % 3 === 0) {
        layout.size = 140;
      }
    }}
    renderItem={({ index, item }) => (
      <ScrollItem
        color={COLORS.yellow}
        altColor={COLORS.yellowAlt}
        index={index}
        width={200}
        height={100}
      >
        {item}
      </ScrollItem>
    )}
  />
);

// ---------------------------------------------------------------------------
// InfiniteScroll — onEndReached appends more data when the user scrolls
// near the bottom. onEndReachedThreshold controls the trigger distance.
// ---------------------------------------------------------------------------

export const InfiniteScroll = () => {
  const [items, setItems] = useState(() => makeItems(20));
  const loadingRef = useRef(false);

  const handleEndReached = () => {
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;

    const next = Array.from({ length: 10 }, (_, i) => `Item ${items.length + i}`);

    setItems((prev) => [...prev, ...next]);
    loadingRef.current = false;
  };

  return (
    <VirtualList
      data={items}
      estimatedItemSize={50}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      style={{ w: 500, h: 500 }}
      ListFooterComponent={() => <Label text={`${items.length} items loaded`} />}
      listFooterSize={30}
      renderItem={({ index, item }) => (
        <ScrollItem
          color={COLORS.teal}
          altColor={COLORS.tealAlt}
          index={index}
          width={500}
          height={50}
        >
          {item}
        </ScrollItem>
      )}
    />
  );
};

// ---------------------------------------------------------------------------
// ItemTypes — getItemType enables view recycling across different item
// types. Items of the same type reuse each other's views, reducing
// mount/unmount overhead.
// ---------------------------------------------------------------------------

type TypedItem = { id: number; type: 'text' | 'image' };

const typedItems: TypedItem[] = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  type: i % 3 === 0 ? 'image' : 'text',
}));

const TextCell = focusable<{ focused?: boolean; label: string }>(({ focused, label }, ref) => (
  <lng-view
    ref={ref}
    style={{
      w: 500,
      h: 50,
      color: focused ? COLORS.teal : 0x00000000,
      border: { w: focused ? 0 : 1, color: COLORS.teal },
    }}
  >
    <lng-text style={{ fontSize: 14, color: 0xffffffff, x: 12, y: 16 }}>{label}</lng-text>
  </lng-view>
));

const ImageCell = focusable<{ focused?: boolean; index: number }>(({ focused, index }, ref) => (
  <lng-view
    ref={ref}
    style={{
      w: 500,
      h: 100,
      color: focused ? COLORS.purple : 0x00000000,
      border: { w: focused ? 0 : 1, color: COLORS.purple },
    }}
  >
    <lng-image
      src={`https://picsum.photos/500/100?seed=${index}`}
      style={{ w: 498, h: 98, x: 1, y: 1, alpha: focused ? 1 : 0.4 }}
    />
  </lng-view>
));

export const ItemTypes = () => (
  <VirtualList
    data={typedItems}
    estimatedItemSize={60}
    style={{ w: 500, h: 500 }}
    keyExtractor={(item) => String(item.id)}
    getItemType={(item) => item.type}
    overrideItemLayout={(layout, item) => {
      layout.size = item.type === 'image' ? 100 : 50;
    }}
    renderItem={({ item, index }) =>
      item.type === 'image' ? (
        <ImageCell index={index} />
      ) : (
        <TextCell label={`Text item ${item.id}`} />
      )
    }
  />
);

// ---------------------------------------------------------------------------
// InitialScrollIndex — The list starts scrolled to a specific item.
// ---------------------------------------------------------------------------

export const InitialScrollIndex = () => (
  <VirtualList
    data={makeItems(100)}
    estimatedItemSize={50}
    initialScrollIndex={42}
    style={{ w: 500, h: 500 }}
    renderItem={({ index, item }) => (
      <ScrollItem
        color={COLORS.yellow}
        altColor={COLORS.yellowAlt}
        index={index}
        width={500}
        height={50}
      >
        {item}
      </ScrollItem>
    )}
  />
);

// ---------------------------------------------------------------------------
// ImperativeScrolling — Using the ref to call scrollToIndex, scrollToEnd,
// and scrollToOffset programmatically.
// ---------------------------------------------------------------------------

const NavButton = focusable<{
  focused?: boolean;
  label: string;
  onEnter: () => void;
}>(({ focused, label, onEnter }, ref) => (
  <lng-view
    ref={ref}
    onKeyUp={(ev) => {
      if (ev.remoteKey === 'Enter') {
        onEnter();
      }

      return true;
    }}
    style={{
      w: 140,
      h: 40,
      borderRadius: 8,
      color: focused ? 0xcccc44ff : 0xcccc44aa,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <lng-text style={{ fontSize: 14, color: 0x222222ff }}>{label}</lng-text>
  </lng-view>
));

export const ImperativeScrolling = () => {
  const listRef = useRef<VirtualListRef>(null);

  return (
    <lng-view style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <lng-view style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
        <NavButton label="Go to #0" onEnter={() => listRef.current?.scrollToIndex({ index: 0 })} />
        <NavButton
          label="Go to #50"
          onEnter={() => listRef.current?.scrollToIndex({ index: 50, viewPosition: 0.5 })}
        />
        <NavButton label="Go to end" onEnter={() => listRef.current?.scrollToEnd()} />
      </lng-view>
      <VirtualList
        ref={listRef}
        data={makeItems(100)}
        estimatedItemSize={50}
        style={{ w: 500, h: 450 }}
        renderItem={({ index, item }) => (
          <ScrollItem
            color={COLORS.teal}
            altColor={COLORS.tealAlt}
            index={index}
            width={500}
            height={50}
          >
            {item}
          </ScrollItem>
        )}
      />
    </lng-view>
  );
};

// ---------------------------------------------------------------------------
// DrawDistance — Controls how many pixels beyond the viewport are
// pre-rendered. Lower values save memory; higher values prevent flashes
// during fast scrolling.
// ---------------------------------------------------------------------------

export const DrawDistance = () => (
  <VirtualList
    data={makeItems(200)}
    estimatedItemSize={50}
    drawDistance={600}
    style={{ w: 500, h: 500 }}
    renderItem={({ index, item }) => (
      <ScrollItem
        color={COLORS.purple}
        altColor={COLORS.purpleAlt}
        index={index}
        width={500}
        height={50}
      >
        {item}
      </ScrollItem>
    )}
  />
);

// ---------------------------------------------------------------------------
// AnimationDuration — Controls how fast scroll animations play.
// A slower animation (600ms) makes the scroll behavior visible.
// ---------------------------------------------------------------------------

export const SlowAnimation = () => (
  <VirtualList
    data={makeItems(50)}
    estimatedItemSize={75}
    animationDuration={600}
    style={{ w: 500, h: 400 }}
    renderItem={({ index, item }) => (
      <ScrollItem
        color={COLORS.yellow}
        altColor={COLORS.yellowAlt}
        index={index}
        width={500}
        height={75}
      >
        {item}
      </ScrollItem>
    )}
  />
);

import { useEffect, useState } from 'react';

import { focusable } from '@plextv/react-lightning';
import VirtualList from '@plextv/react-lightning-components/lists/VirtualList';

type RowData = {
  id: number;
  label: string;
  items: string[];
};

const COLORS = [0x4fafafff, 0xafaf4fff, 0x9f5fdfff, 0xdf5f9fff, 0x5fdf5fff];
const ROWS: RowData[] = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  label: `Row ${i}`,
  items: i === 2 ? [] : Array.from({ length: 40 }, (_, j) => `R${i} Item ${j}`),
}));

const SMALL_ROW_IDS = new Set([3, 23]);
const isSmallRow = (id: number) => SMALL_ROW_IDS.has(id);

const InnerItem = focusable<{
  focused?: boolean;
  label: string;
  color: number;
  small?: boolean;
  autoFocus?: boolean;
}>(
  ({ focused, label, color, small }, ref) => {
    const timeoutDuration = Math.random() * 1000 + 6;

    const [w, setW] = useState(0);
    const [h, setH] = useState(0);

    useEffect(() => {
      setTimeout(() => {
        setW(small ? 130 : 160);
        setH(small ? 50 : 90);
      }, timeoutDuration);
    }, [small]);

    return (
      <lng-view
        ref={ref}
        style={{
          w,
          h,
          borderRadius: 6,
          color: focused ? color : 0x00000000,
          border: { w: focused ? 0 : 2, color },
        }}
      >
        <lng-text
          style={{
            fontSize: 12,
            color: focused ? 0x000000ff : 0xccccccff,
            mount: 0.5,
            x: w / 2,
            y: h / 2,
          }}
        >
          {label}
        </lng-text>
      </lng-view>
    );
  },
  'InnerItem',
  (props) => ({ autoFocus: props.autoFocus ?? false }),
);

const RowRenderer = ({ item }: { item: RowData }) => {
  const color = COLORS?.[item.id % COLORS.length] ?? 0xff4f4fff;
  const small = isSmallRow(item.id);
  const itemHeight = small ? 50 : 90;

  return (
    <lng-view style={{ flex: 1, display: 'flex' }}>
      <lng-text style={{ fontSize: 14, color: 0x888888ff }}>{item.label}</lng-text>

      <VirtualList
        data={item.items}
        horizontal
        drawDistance={200}
        style={{ flex: 1, h: itemHeight }}
        keyExtractor={(_label, index) => `${item.id}-${index}`}
        renderItem={({ item: label, shouldFocus }) => (
          <InnerItem label={label} color={color} small={small} autoFocus={shouldFocus} />
        )}
      />
    </lng-view>
  );
};

export const NestedListPage = () => (
  <lng-view style={{ w: 960, h: 540 }}>
    <lng-text style={{ fontSize: 20, color: 0xffffffff, x: 16, y: 8 }}>
      Nested VirtualList — Scroll Persistence
    </lng-text>
    <lng-text style={{ fontSize: 12, color: 0x666666ff, x: 16, y: 34 }}>
      Scroll inner rows, then scroll outer list away and back. Position should be preserved.
    </lng-text>
    <VirtualList
      data={ROWS}
      drawDistance={200}
      overrideItemLayout={(layout, row) => {
        if (row.items.length === 0) {
          layout.size = 0;
        }
      }}
      style={{ w: 960, h: 480, y: 55 }}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <RowRenderer item={item} />}
    />
  </lng-view>
);

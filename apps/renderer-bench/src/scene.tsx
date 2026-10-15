// @ts-nocheck -- intrinsic lng-* tags are typed by react-lightning only; the MVP accepts the same names.
import { memo, useEffect, useLayoutEffect, useState } from 'react';

export const ROWS = 10;
export const COLS = 12;
const TILE_W = 240;
const TILE_H = 430;
const STRIDE = 270;
const ROW_H = 520;
const TITLES = [
  'The Long Goodbye',
  'Northern Lights',
  'A Quiet Place to Stay',
  'Midnight Express',
  'Glass Onion',
  'The Very Long Title That Will Need An Ellipsis',
];

const posterUrl = (r: number, c: number) =>
  `/posters/p${(r * COLS + c) % 10}.jpg?i=${r * COLS + c}`;

const Tile = memo(function Tile({ r, c, focused }: { r: number; c: number; focused: boolean }) {
  return (
    <lng-view
      style={{
        x: c * STRIDE,
        y: 0,
        w: TILE_W,
        h: TILE_H,
        scale: focused ? 1.08 : 1,
        zIndex: focused ? 1 : 0,
      }}
      transition={{ scale: { duration: 150 } }}
    >
      <lng-image src={posterUrl(r, c)} style={{ x: 0, y: 0, w: TILE_W, h: 360, borderRadius: 8 }} />
      <lng-view style={{ x: 176, y: 8, w: 56, h: 28, color: 0xe5a00dff, borderRadius: 6 }}>
        <lng-text
          style={{
            x: 12,
            y: 2,
            fontSize: 18,
            lineHeight: 24,
            color: 0x000000ff,
            fontFamily: 'Ubuntu',
          }}
        >
          4K
        </lng-text>
      </lng-view>
      <lng-text
        style={{
          x: 0,
          y: 370,
          fontSize: 24,
          lineHeight: 30,
          maxWidth: TILE_W,
          maxLines: 1,
          contain: 'width',
          color: 0xffffffff,
          fontFamily: 'Ubuntu',
        }}
      >
        {TITLES[(r + c) % TITLES.length]}
      </lng-text>
      <lng-text
        style={{
          x: 0,
          y: 402,
          fontSize: 20,
          lineHeight: 26,
          maxWidth: TILE_W,
          maxLines: 1,
          contain: 'width',
          color: 0xaaaaaaff,
          fontFamily: 'Ubuntu',
        }}
      >
        {`${1990 + ((r * 7 + c) % 30)} · ${90 + c} min`}
      </lng-text>
      <lng-view
        style={{
          x: -6,
          y: -6,
          w: TILE_W + 12,
          h: 372,
          borderRadius: 12,
          border: { w: 4, color: 0xffffffff },
          alpha: focused ? 1 : 0,
        }}
      />
    </lng-view>
  );
});

const Row = memo(function Row({
  r,
  col,
  focusedCol,
}: {
  r: number;
  col: number;
  focusedCol: number;
}) {
  const tiles = [];

  for (let c = 0; c < COLS; c++) {
    tiles.push(<Tile key={c} r={r} c={c} focused={c === focusedCol} />);
  }

  return (
    <lng-view style={{ x: 0, y: r * ROW_H, w: 1840, h: ROW_H }}>
      <lng-text
        style={{
          x: 0,
          y: 0,
          fontSize: 32,
          lineHeight: 40,
          color: 0xffffffff,
          fontFamily: 'Ubuntu',
        }}
      >{`Hub row ${r + 1}`}</lng-text>
      <lng-view style={{ x: 0, y: 50, w: 1840, h: TILE_H + 60, clipping: true }}>
        <lng-view
          style={{ x: -Math.max(0, col - 1) * STRIDE, y: 30, w: COLS * STRIDE, h: TILE_H }}
          transition={{ x: { duration: 200 } }}
        >
          {tiles}
        </lng-view>
      </lng-view>
    </lng-view>
  );
});

export type Step = 'ArrowRight' | 'ArrowLeft' | 'ArrowDown' | 'ArrowUp';

export function Home({ onFocus }: { onFocus?: (r: number, c: number) => void }) {
  const [row, setRow] = useState(0);
  const [cols, setCols] = useState<number[]>(() => Array.from({ length: ROWS }, () => 0));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCols((cs) => cs.map((c, i) => (i === row ? Math.min(COLS - 1, c + 1) : c)));
      } else if (e.key === 'ArrowLeft') {
        setCols((cs) => cs.map((c, i) => (i === row ? Math.max(0, c - 1) : c)));
      } else if (e.key === 'ArrowDown') {
        setRow((r) => Math.min(ROWS - 1, r + 1));
      } else if (e.key === 'ArrowUp') {
        setRow((r) => Math.max(0, r - 1));
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [row]);

  useLayoutEffect(() => {
    onFocus?.(row, cols[row]);
  }, [row, cols, onFocus]);

  const rows = [];

  for (let r = 0; r < ROWS; r++) {
    rows.push(<Row key={r} r={r} col={cols[r]} focusedCol={r === row ? cols[r] : -1} />);
  }

  return (
    <lng-view style={{ x: 0, y: 0, w: 1920, h: 1080, color: 0x141414ff }}>
      <lng-view
        style={{ x: 80, y: 60 - Math.max(0, row - 0) * ROW_H, w: 1840, h: ROWS * ROW_H }}
        transition={{ y: { duration: 200 } }}
      >
        {rows}
      </lng-view>
    </lng-view>
  );
}

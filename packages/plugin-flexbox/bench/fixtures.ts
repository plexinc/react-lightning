import { BENCH_FONT } from './atlas';

// Synthetic proxies for the pages we ship, modeled on their real layout shape
// (not their pixels). Each cell is an independent flex root, matching how
// VirtualListCell wraps every row/tile in a FlexRoot. The harness mounts a
// window of cells, then recycles top->bottom to model a browse scroll.

export type NodeSpec = {
  style?: Record<string, unknown>;
  text?: string;
  fontSize?: number;
  children?: NodeSpec[];
};

export type Fixture = {
  name: string;
  // Structural note shown in the report.
  shape: string;
  // Builds the Nth cell's content subtree (deterministic in n).
  cell: (n: number) => NodeSpec;
  // Cross-axis size the harness pins on each cell root (viewport width or
  // tile width), or undefined to let the cell shrink-to-content.
  cellCrossSize?: number;
  window: number;
  scrollSteps: number;
};

const title = (text: string, fontSize = 24): NodeSpec => ({
  style: { fontFamily: BENCH_FONT, fontSize, maxLines: 1 },
  text,
  fontSize,
});

const line = (text: string, fontSize = 18): NodeSpec => ({
  style: { fontFamily: BENCH_FONT, fontSize, maxLines: 2 },
  text,
  fontSize,
});

// A poster tile: container column holding an image box and 1-2 text lines.
// Text has no explicit width, so it shrink-wraps and the column height is
// content-driven (the exact case that makes cells grow after mount).
const tile = (n: number, withSubtitle = true): NodeSpec => ({
  style: { display: 'flex', flexDirection: 'column', gap: 8 },
  children: [
    { style: { w: 214, h: 320 } }, // artwork box
    title(`Title ${n}`),
    ...(withSubtitle ? [line(`A synthetic subtitle for item number ${n}`)] : []),
  ],
});

// A horizontal row of tiles (Home / row-scroller).
const row = (n: number, tiles: number): NodeSpec => ({
  style: { display: 'flex', flexDirection: 'row', gap: 24 },
  children: Array.from({ length: tiles }, (_, i) => tile(n * tiles + i)),
});

export const fixtures: Fixture[] = [
  {
    name: 'home',
    shape: 'vertical list of horizontal tile rows (section title + row)',
    cell: (n) => ({
      style: { display: 'flex', flexDirection: 'column', gap: 16 },
      children: [title(`Section ${n}`, 28), row(n, 8)],
    }),
    cellCrossSize: 1920,
    window: 5,
    scrollSteps: 20,
  },
  {
    name: 'details',
    shape: 'hero block + metadata lines + related rows',
    cell: (n) =>
      n === 0
        ? {
            style: { display: 'flex', flexDirection: 'column', gap: 12 },
            children: [
              { style: { w: 1920, h: 720 } }, // hero art
              title('The Synthetic Feature Presentation', 48),
              line('2026  1h 54m  PG', 20),
              line(
                'Every night a shepherd reads aloud a murder mystery to his flock. When he is found dead, the sheep set out to solve it themselves before the next full moon.',
                22,
              ),
            ],
          }
        : {
            style: { display: 'flex', flexDirection: 'column', gap: 16 },
            children: [title(`Related ${n}`, 28), row(n, 8)],
          },
    cellCrossSize: 1920,
    window: 4,
    scrollSteps: 16,
  },
  {
    name: 'grid',
    shape: 'uniform poster grid (row of fixed-size tiles per cell)',
    cell: (n) => ({
      style: { display: 'flex', flexDirection: 'row', gap: 24 },
      children: Array.from({ length: 6 }, (_, i) => tile(n * 6 + i, false)),
    }),
    cellCrossSize: 1920,
    window: 6,
    scrollSteps: 24,
  },
  {
    name: 'epg',
    shape: 'channel row: logo + horizontal airing blocks with title + time',
    cell: (n) => ({
      style: { display: 'flex', flexDirection: 'row', gap: 4 },
      children: [
        { style: { w: 160, h: 96 } }, // channel logo
        ...Array.from({ length: 8 }, (_, i) => ({
          style: { display: 'flex', flexDirection: 'column', gap: 4, w: 300, h: 96 },
          children: [title(`Program ${n}-${i}`, 20), line('8:00 PM - 9:00 PM', 16)],
        })),
      ],
    }),
    cellCrossSize: 1920,
    window: 8,
    scrollSteps: 24,
  },
];

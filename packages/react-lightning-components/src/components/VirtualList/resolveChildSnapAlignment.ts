import type { LightningElement } from '@plextv/react-lightning';

type SnapAlignment = 'start' | 'center' | 'end';

export interface ChildSnapTarget {
  align?: SnapAlignment;
  /** Per-item pixel offset (`scrollSnapOffset`); wins over `align`. */
  offset?: number;
}

const VALID_ALIGNMENTS: ReadonlySet<string> = new Set(['start', 'center', 'end']);

// The row root is a first-child descent away (cell FocusGroup -> FlexRoot ->
// row); the cap only bounds the walk on rows with deep single-child chains.
const MAX_DEPTH = 5;

/**
 * The focused row's own snap marker, read from the cell's content.
 *
 * react-native-tvos lets each list row override the list-level snap alignment
 * (`snapToAlignment="item"` defers entirely to the rows) via `scrollSnapAlign`
 * or `scrollSnapOffset`; offset wins when both sit on the same view, matching
 * the native fork. The props ride on the row's Pressable/View and pass through
 * to the Lightning element. Focus events hand the list its direct child (the
 * cell wrapper), so the row root is found by descending first children;
 * separators render after the content, so the first child is always the
 * content side.
 */
export function resolveChildSnapTarget(cell: LightningElement): ChildSnapTarget | undefined {
  let curr: LightningElement | null = cell;

  for (let depth = 0; curr && depth < MAX_DEPTH; depth++) {
    const props = curr.props as { scrollSnapAlign?: unknown; scrollSnapOffset?: unknown };

    if (typeof props.scrollSnapOffset === 'number' && Number.isFinite(props.scrollSnapOffset)) {
      return { offset: props.scrollSnapOffset };
    }

    if (typeof props.scrollSnapAlign === 'string' && VALID_ALIGNMENTS.has(props.scrollSnapAlign)) {
      return { align: props.scrollSnapAlign as SnapAlignment };
    }

    curr = curr.children[0] ?? null;
  }

  return undefined;
}

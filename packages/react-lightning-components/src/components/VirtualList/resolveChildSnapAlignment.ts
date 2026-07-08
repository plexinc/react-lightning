import type { LightningElement } from '@plextv/react-lightning';

type SnapAlignment = 'start' | 'center' | 'end';

const VALID_ALIGNMENTS: ReadonlySet<string> = new Set(['start', 'center', 'end']);

// The row root is a first-child descent away (cell FocusGroup -> FlexRoot ->
// row); the cap only bounds the walk on rows with deep single-child chains.
const MAX_DEPTH = 5;

/**
 * The focused row's own `scrollSnapAlign`, read from the cell's content.
 *
 * react-native-tvos lets each list row override the list-level snap alignment
 * (`snapToAlignment="item"` defers entirely to the rows). The prop rides on
 * the row's Pressable/View and passes through to the Lightning element.
 * Focus events hand the list its direct child (the cell wrapper), so the row
 * root is found by descending first children; separators render after the
 * content, so the first child is always the content side.
 */
export function resolveChildSnapAlignment(cell: LightningElement): SnapAlignment | undefined {
  let curr: LightningElement | null = cell;

  for (let depth = 0; curr && depth < MAX_DEPTH; depth++) {
    const value = (curr.props as { scrollSnapAlign?: unknown }).scrollSnapAlign;

    if (typeof value === 'string' && VALID_ALIGNMENTS.has(value)) {
      return value as SnapAlignment;
    }

    curr = curr.children[0] ?? null;
  }

  return undefined;
}

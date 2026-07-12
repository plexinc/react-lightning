import type { Node } from 'yoga-layout';

import type { TextMeasureProps } from '../text/layoutText';

export type ManagerNode = {
  id: number;
  parent?: ManagerNode;
  node: Node;
  children: ManagerNode[];
  props: Record<string, unknown>;
  /** Set when this node is a measured text leaf (has a Yoga measure func). */
  text?: {
    fontFamily: string;
    props: TextMeasureProps;
  };
  /** Percentage translate (of the node's own size), resolved at layout readback. */
  translatePercent?: { x?: number; y?: number };
  /** Last emitted resolved position for a percent node, to dedupe readback writes. */
  resolvedTranslate?: { left: number; top: number };
};

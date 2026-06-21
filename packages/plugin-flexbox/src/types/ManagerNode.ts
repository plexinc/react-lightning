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
};

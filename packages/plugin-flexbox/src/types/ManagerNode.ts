import type { Node } from 'yoga-layout';

export type ManagerNode = {
  id: number;
  parent?: ManagerNode;
  node: Node;
  children: ManagerNode[];
  props: Record<string, unknown>;
};

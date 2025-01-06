import type { SimpleElement } from '../../types';

export type TreeViewNode = {
  id: string;
  element: SimpleElement;
  children?: TreeViewNode[];
};

import type { ElementTreeNode } from '../../tree/BidirectionalDataTree';
import type { SimpleElement } from '../../types';
import { FocusTreeNode } from './FocusTreeNode';

type Props = {
  tree: ElementTreeNode<SimpleElement>;
};

export const FocusTree = ({ tree }: Props) => {
  return (
    <>
      {Array.from(tree.children).map((child) => (
        <FocusTreeNode key={child.id} node={child} />
      ))}
    </>
  );
};

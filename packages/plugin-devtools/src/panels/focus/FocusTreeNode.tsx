import { useCallback, useContext } from 'react';
import { HoveredPreviewContext } from '../../preview/HoveredPreviewProvider';
import { SelectedPreviewContext } from '../../preview/SelectedPreviewProvider';
import type { ElementTreeNode } from '../../tree/BidirectionalDataTree';
import { TreeNode } from '../../tree/TreeNode';
import type { SimpleElement } from '../../types';

export const FocusTreeNode = ({
  node,
}: {
  node: ElementTreeNode<SimpleElement>;
}) => {
  const { set: setPreviewElement } = useContext(SelectedPreviewContext);
  const { set: setHoveredElement } = useContext(HoveredPreviewContext);

  const handleClick = useCallback(() => {
    setPreviewElement(node.element);
  }, [node.element, setPreviewElement]);

  const handleMouseOver = useCallback(() => {
    setHoveredElement(node.element);
  }, [node.element, setHoveredElement]);

  const handleMouseOut = useCallback(() => {
    setHoveredElement(null);
  }, [setHoveredElement]);

  return (
    <TreeNode
      id={node.element.id}
      label={node.element.name ?? 'Unknown'}
      subLabel={`(id: ${node.element.id})`}
      onSelect={handleClick}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      {Array.from(node.children).map((child, index) => (
        <FocusTreeNode key={`${child.element.id}-${index}`} node={child} />
      ))}
    </TreeNode>
  );
};

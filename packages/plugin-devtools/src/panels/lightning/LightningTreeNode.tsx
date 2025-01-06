import { useCallback } from 'react';
import type { NodeRendererProps } from 'react-arborist';
import { sendMessage } from 'webext-bridge/devtools';
import { useInspectorOption } from '../../inspector/InspectorOptions';
import { TreeNode } from '../../tree/TreeNode';
import type { TreeViewNode } from './TreeViewNode';

export const LightningTreeNode = ({
  node,
  style,
}: NodeRendererProps<TreeViewNode>) => {
  const [alwaysShowIds] = useInspectorOption('alwaysShowIds');

  const handleMouseOver = useCallback(() => {
    sendMessage('setHoveredElement', node.data.element.id, 'window');
  }, [node.data.element]);

  const handleMouseOut = useCallback(() => {
    sendMessage('setHoveredElement', null, 'window');
  }, []);

  return (
    <TreeNode
      id={node.id}
      label={node.data.element.name}
      subLabel={`(id: ${node.id})`}
      subLabelAlwaysVisible={alwaysShowIds}
      isSelected={node.isSelected}
      isClosed={node.isClosed}
      isFocused={node.data.element.focused}
      isFocusable={node.data.element.focusable}
      isLeaf={node.isLeaf}
      style={style}
      onToggle={() => node.toggle()}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    />
  );
};

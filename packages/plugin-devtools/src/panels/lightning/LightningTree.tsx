import { useCallback, useContext, useRef } from 'react';
import { type NodeApi, Tree, TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import { sendMessage } from 'webext-bridge/devtools';
import { useExtensionMessaging } from '../../communication/useExtensionMessaging';
import { SelectedPreviewContext } from '../../preview/SelectedPreviewProvider';
import useRefStoreContext from '../../store/useRefStoreContext';
import type { ElementTreeNode } from '../../tree/BidirectionalDataTree';
import type { SimpleElement } from '../../types';
import type { LightningTreeFilter } from './LightningTreeFilter';
import { LightningTreeNode } from './LightningTreeNode';
import type { TreeViewNode } from './TreeViewNode';

type Props = {
  tree: ElementTreeNode<SimpleElement>;
  filter?: string;
};

function toTreeViewNodes(node: ElementTreeNode<SimpleElement>): TreeViewNode {
  const treeNode: TreeViewNode = {
    id: node.id.toString(),
    element: node.element,
  };

  if (node.children.size > 0) {
    treeNode.children = Array.from(node.children).map((child) =>
      toTreeViewNodes(child),
    );
  }

  return treeNode;
}

export const LightningTree = ({ tree, filter }: Props) => {
  const nodes = toTreeViewNodes(tree);
  const selectedElement = useRefStoreContext(SelectedPreviewContext);
  const { set: setSelectedElement } = useContext(SelectedPreviewContext);
  const { height, ref } = useResizeObserver();

  const handleSelect = useCallback(
    (nodes: NodeApi<TreeViewNode>[]) => {
      const node = nodes[0];

      if (!node) {
        return;
      }

      setSelectedElement(node.data.element);
      sendMessage('setSelectedElement', node.data.element.id, 'window');
      sendMessage('requestProps', node.data.element.id, 'window');
    },
    [setSelectedElement],
  );

  return (
    <div ref={ref} style={{ height: '100%', width: '100%' }}>
      <Tree
        data={nodes.children}
        openByDefault={true}
        disableDrag={true}
        width="100%"
        height={height}
        indent={16}
        rowHeight={24}
        selection={selectedElement?.id.toString()}
        searchTerm={filter}
        searchMatch={(node, filter) => {
          const { searchTerm, onlyShowFocusables, onlyShowFocused } =
            JSON.parse(filter) as LightningTreeFilter;

          const hasSearchTerm =
            node.data.element.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            node.data.element.id.toString().includes(searchTerm);

          const hasFocusable =
            !onlyShowFocusables || node.data.element.focusable;

          const hasFocused = !onlyShowFocused || node.data.element.focused;

          return hasSearchTerm && hasFocusable && hasFocused;
        }}
        onSelect={handleSelect}
      >
        {LightningTreeNode}
      </Tree>
    </div>
  );
};

import { NodeOperations } from './types/NodeOperations';
import { SimpleDataView } from './util/SimpleDataView';
import { YogaManager } from './YogaManager';

const manager = new YogaManager();

manager.on('render', (buffer) => {
  self.postMessage({ id: 'render', result: buffer }, [buffer]);
});

function applyNodeOperations(buffer: ArrayBuffer) {
  const dataView = new SimpleDataView(buffer);

  while (dataView.hasSpace(1)) {
    const method = dataView.readUint8();

    switch (method) {
      case NodeOperations.AddNode: {
        const elementId = dataView.readUint32();
        manager.addNode(elementId);
        break;
      }
      case NodeOperations.RemoveNode: {
        const elementId = dataView.readUint32();
        manager.removeNode(elementId);
        break;
      }
      case NodeOperations.AddChildNode:
      case NodeOperations.AddChildNodeAtIndex: {
        const parentId = dataView.readUint32();
        const childId = dataView.readUint32();
        const index =
          method === NodeOperations.AddChildNodeAtIndex
            ? dataView.readUint32()
            : undefined;

        manager.addChildNode(parentId, childId, index);
        break;
      }
    }
  }
}

function getClampedSize(id: number, buffer: ArrayBuffer) {
  // Buffer contains callback Id and element Id
  const dataView = new SimpleDataView(buffer);

  while (dataView.hasSpace(4)) {
    // Skip the callback id, we'll just overwrite the element id with the result
    dataView.moveBy(4);

    const elementId = dataView.readUint32();
    const result = manager.getClampedSize(elementId);

    dataView.moveBy(-4);
    dataView.writeUint32(result ?? 0);
  }

  // Send the buffer back
  self.postMessage({ id, result: buffer }, [buffer]);
}

self.onmessage = async (
  event: MessageEvent<{
    id: number;
    method: keyof typeof manager | 'nodeOperations';
    args?: unknown[];
  }>,
) => {
  const { id, method, args } = event.data;

  switch (method) {
    case 'queueRender':
      manager.queueRender(args?.[0] as number);
      break;
    case 'nodeOperations':
      applyNodeOperations(args?.[0] as ArrayBuffer);
      break;
    case 'getClampedSize':
      getClampedSize(id, args?.[0] as ArrayBuffer);
      break;
    default: {
      try {
        if (typeof manager[method] === 'function') {
          // @ts-expect-error Dynamic method call
          let result: Promise<unknown> | null | unknown = manager[method].apply(
            manager,
            args,
          );

          if (
            result != null &&
            typeof result === 'object' &&
            'then' in result
          ) {
            result = await (result as Promise<unknown>);
          }

          if (id !== undefined) {
            self.postMessage({ id, result });
          }
        } else {
          self.postMessage({ id, error: `Method ${method} is not a function` });
        }
      } catch (error) {
        const message =
          typeof error === 'string' ? error : (error as Error).message;

        self.postMessage({ id, error: message });
      }
    }
  }
};

export default {};

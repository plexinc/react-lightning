import type { LightningElementStyle } from '@plextv/react-lightning';

import { NodeOperations } from './types/NodeOperations';
import { YogaManager } from './YogaManager';

const manager = new YogaManager();

manager.on('render', (buffer) => {
  self.postMessage({ id: 'render', result: buffer }, [buffer]);
});

function applyNodeOperations(buffer: ArrayBuffer) {
  // Raw `DataView` instead of `SimpleDataView` — pure read loop, called
  // per `'flushBoth'`/`'nodeOperations'` message. Manual offset
  // arithmetic skips `SimpleDataView`'s wrapper object and the
  // `_readInt` switch-statement indirection.
  const view = new DataView(buffer);
  const length = buffer.byteLength;
  let offset = 0;

  while (offset < length) {
    const method = view.getUint8(offset);
    offset += 1;

    switch (method) {
      case NodeOperations.AddNode: {
        const elementId = view.getUint32(offset, true);
        offset += 4;
        manager.addNode(elementId);
        break;
      }
      case NodeOperations.RemoveNode: {
        const elementId = view.getUint32(offset, true);
        offset += 4;
        manager.removeNode(elementId);
        break;
      }
      case NodeOperations.AddChildNode:
      case NodeOperations.AddChildNodeAtIndex: {
        const parentId = view.getUint32(offset, true);
        const childId = view.getUint32(offset + 4, true);
        offset += 8;

        let index: number | undefined;

        if (method === NodeOperations.AddChildNodeAtIndex) {
          index = view.getUint32(offset, true);
          offset += 4;
        }

        manager.addChildNode(parentId, childId, index);
        break;
      }
      case NodeOperations.DetachChildNode: {
        const parentId = view.getUint32(offset, true);
        const childId = view.getUint32(offset + 4, true);
        offset += 8;

        manager.detachChildNode(parentId, childId);
        break;
      }
      case NodeOperations.AddIndependentRoot: {
        const elementId = view.getUint32(offset, true);
        offset += 4;
        manager.addIndependentRoot(elementId);
        break;
      }
      case NodeOperations.RemoveIndependentRoot: {
        const elementId = view.getUint32(offset, true);
        offset += 4;
        manager.removeIndependentRoot(elementId);
        break;
      }
    }
  }
}

self.onmessage = async (
  event: MessageEvent<{
    id: number;
    method: keyof typeof manager | 'nodeOperations' | 'flushBoth';
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
    case 'flushBoth': {
      // Combined message: apply node-tree mutations first, then styles.
      // Mirrors the causal ordering the previous two-message setup
      // enforced by having `flushSendStyles` call `flushChildOperations`
      // before posting `applyStyles`. Sent only when BOTH sets are
      // pending at flush time — single-purpose paths still use the
      // `'nodeOperations'` and `'applyStyles'` (default) messages.
      applyNodeOperations(args?.[0] as ArrayBuffer);
      manager.applyStyles(
        args?.[1] as Record<number, Partial<LightningElementStyle>>,
        args?.[2] as boolean,
      );
      break;
    }
    default: {
      try {
        if (typeof manager[method] === 'function') {
          // @ts-expect-error Dynamic method call
          let result: Promise<unknown> | null | unknown = manager[method].apply(manager, args);

          if (result != null && typeof result === 'object' && 'then' in result) {
            result = await (result as Promise<unknown>);
          }

          if (id !== undefined) {
            self.postMessage({ id, result });
          }
        } else {
          self.postMessage({ id, error: `Method ${method} is not a function` });
        }
      } catch (error) {
        const message = typeof error === 'string' ? error : (error as Error).message;

        self.postMessage({ id, error: message });
      }
    }
  }
};

export default {};

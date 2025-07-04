import type { LightningElementStyle } from '@plextv/react-lightning';
import { EventEmitter } from 'tseep';
import { NodeOperations } from './types/NodeOperations';
import { SimpleDataView } from './util/SimpleDataView';
import Worker from './worker?worker';
import type { YogaManager, YogaManagerEvents } from './YogaManager';

const DELAY_DURATION = 1;

// biome-ignore lint/suspicious/noExplicitAny: Basic type for function signatures
type AnyFunc = (...args: any[]) => any;
// biome-ignore lint/suspicious/noExplicitAny: We don't care about the first parameter type here
type ParametersExceptFirst<T> = T extends (first: any, ...args: infer U) => any
  ? U
  : never;

export type Workerized<T> = {
  [K in keyof T]: T[K] extends AnyFunc
    ? ReturnType<T[K]> extends PromiseLike<unknown>
      ? T[K]
      : (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
    : never;
};

function delay<T extends (...args: unknown[]) => void | Promise<void>>(
  fn: T,
  delay: number,
): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: unknown[];

  const delayedFn = function (this: unknown, ...args: unknown[]) {
    latestArgs = args;

    if (timeout) {
      return;
    }

    timeout = setTimeout(() => {
      timeout = null;
      fn.apply(this, latestArgs);
    }, delay);
  };

  return delayedFn as T;
}

function wrapWorker<T>(worker: Worker): Workerized<T> {
  const _callees: Record<string, [AnyFunc, AnyFunc]> = {};
  const _eventEmitter = new EventEmitter<YogaManagerEvents>();
  let _stylesToSend: Record<number, Partial<LightningElementStyle>> = {};
  let _needsRender = false;
  // TODO: Handle possible overflows
  const _childOperations = new SimpleDataView();
  const _sizeRequests = new SimpleDataView();
  let _sizeRequestPromise: Promise<void> | null = null;

  const queueSendStyles = delay(() => {
    const needsRender = _needsRender;

    if (Object.keys(_stylesToSend).length === 0) {
      return;
    }

    worker.postMessage({
      method: 'applyStyles',
      args: [_stylesToSend, !needsRender],
    });

    _needsRender = false;
    _stylesToSend = {};
  }, DELAY_DURATION);

  function applyStyle(
    elementId: number,
    style: Partial<LightningElementStyle> | null,
    skipRender = false,
  ) {
    if (style) {
      _stylesToSend[elementId] = {
        ..._stylesToSend[elementId],
        ...style,
      };
    } else {
      delete _stylesToSend[elementId];
    }

    _needsRender ||= !skipRender;

    queueSendStyles();
  }

  const queueSendNodeOperations = delay(() => {
    const buffer = _childOperations.buffer;

    if (buffer.byteLength === 0) {
      return;
    } else {
      worker.postMessage(
        {
          method: 'nodeOperations',
          args: [buffer],
        },
        [buffer],
      );
    }

    _childOperations.reset();
  }, DELAY_DURATION);

  function nodeOperation(
    method: 'addNode' | 'removeNode' | 'addChildNode',
    elementOrParentId: number,
    childId?: number,
    index?: number,
  ) {
    // Batch operations into a buffer for quick transfers and less postMessage calls
    switch (method) {
      case 'addNode':
        _childOperations.writeUint8(NodeOperations.AddNode);
        _childOperations.writeUint32(elementOrParentId);
        break;
      case 'removeNode':
        _childOperations.writeUint8(NodeOperations.RemoveNode);
        _childOperations.writeUint32(elementOrParentId);
        break;
      case 'addChildNode':
        if (childId === undefined) {
          throw new Error(
            'Child ID must be provided for addChildNode operation',
          );
        }

        _childOperations.writeUint8(
          index === undefined
            ? NodeOperations.AddChildNode
            : NodeOperations.AddChildNodeAtIndex,
        );
        _childOperations.writeUint32(elementOrParentId);
        _childOperations.writeUint32(childId);

        if (index !== undefined) {
          _childOperations.writeUint32(index);
        }
        break;
      default:
        throw new Error(`Unknown node operation: ${method}`);
    }

    queueSendNodeOperations();
  }

  const queueSendSizeRequests = delay(() => {
    if (_sizeRequestPromise) {
      return _sizeRequestPromise;
    }

    const buffer = _sizeRequests.buffer;

    if (buffer.byteLength === 0) {
      return;
    }

    _sizeRequestPromise = new Promise((resolve, reject) => {
      const id = getId();

      _callees[id] = [
        (buffer: ArrayBuffer) => {
          const dataView = new SimpleDataView(buffer);

          while (dataView.hasSpace(4)) {
            const callbackId = dataView.readUint32();
            const size = dataView.readUint32();

            const callee = _callees[callbackId];

            if (!callee) {
              console.error(
                `No handler found for size request id: ${callbackId}`,
              );
              continue;
            }

            const [resolveCall] = callee;

            delete _callees[callbackId];
            resolveCall(size === 0 ? null : size);
          }

          _sizeRequestPromise = null;
          resolve();
        },
        () => {
          _sizeRequestPromise = null;
          reject();
        },
      ];

      worker.postMessage(
        {
          id,
          method: 'getClampedSize',
          args: [buffer],
        },
        [buffer],
      );

      _sizeRequests.reset();
    });
  }, DELAY_DURATION);

  function getClampedSize(elementId: number) {
    const callbackId = getId();

    _sizeRequests.writeUint32(callbackId);
    _sizeRequests.writeUint32(elementId);

    queueSendSizeRequests();

    return new Promise((resolve, reject) => {
      _callees[callbackId] = [
        (size: number) => {
          resolve(size === -1 ? null : size);
        },
        reject,
      ];
    });
  }

  worker.onmessage = (
    event: MessageEvent<{ id: string; result?: unknown; error?: string }>,
  ) => {
    const { id, result, error } = event.data;

    if (id === 'render') {
      // Special case for render updates
      _eventEmitter.emit('render', result as ArrayBuffer);
      return;
    }

    const callee = _callees[id];

    if (!callee) {
      console.error(`No handler found for worker message id: ${id}`);
      return;
    }

    const [resolve, reject] = callee;

    delete _callees[id];

    if (error) {
      reject(new Error(error));
    } else {
      resolve(result);
    }
  };

  // @ts-expect-error
  const proxy: Workerized<T> = new Proxy(() => {}, {
    get(_, prop) {
      if (typeof prop !== 'string') {
        return undefined;
      }

      // Event handlers like 'on' are not wrapped
      if (prop === 'on') {
        return _eventEmitter.on.bind(_eventEmitter);
      } else if (prop === 'off') {
        return _eventEmitter.off.bind(_eventEmitter);
      } else if (prop === 'applyStyle') {
        // Special case for applyStyle
        return applyStyle;
      } else if (
        prop === 'addNode' ||
        prop === 'removeNode' ||
        prop === 'addChildNode'
      ) {
        return (...args: ParametersExceptFirst<typeof nodeOperation>) =>
          nodeOperation(prop, ...args);
      } else if (prop === 'getClampedSize') {
        return getClampedSize;
      }

      return (...args: unknown[]) =>
        new Promise((resolve, reject) => {
          const id = getId();

          _callees[id] = [resolve, reject];

          worker.postMessage({ id, method: prop, args });
        });
    },
  });

  return proxy;
}

let count = 0;
function getId(): number {
  return ++count;
}

export default wrapWorker<YogaManager>(new Worker());

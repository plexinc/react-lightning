import { EventEmitter } from 'tseep';

import type { LightningElementStyle } from '@plextv/react-lightning';

import { NodeOperations } from './types/NodeOperations';
import { isFlexStyleProp } from './util/isFlexStyleProp';
import { SimpleDataView } from './util/SimpleDataView';
import { toSerializableValue } from './util/toSerializableValue';
import Worker from './worker?worker&inline';
import type { YogaManager, YogaManagerEvents } from './YogaManager';

// oxlint-disable-next-line typescript/no-explicit-any -- Basic type for function signatures
type AnyFunc = (...args: any[]) => any;

export type Workerized<T> = {
  [K in keyof T]: T[K] extends AnyFunc
    ? ReturnType<T[K]> extends PromiseLike<unknown>
      ? T[K]
      : (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
    : never;
};

/**
 * Coalesces calls within a sync task — runs `fn` once at the end of the
 * current sync code with the latest args. Uses a microtask, not setTimeout,
 * because the timer's 1ms+ minimum breaks coalescing during a React commit.
 */
function debounceMicrotask<T extends (...args: unknown[]) => void | Promise<void>>(fn: T): T {
  let scheduled = false;
  let latestArgs: unknown[];

  const debouncedFn = function (this: unknown, ...args: unknown[]) {
    latestArgs = args;

    if (scheduled) {
      return;
    }

    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      fn.apply(this, latestArgs);
    });
  };

  return debouncedFn as T;
}

function wrapWorker<T>(worker: Worker): Workerized<T> {
  const _callees: Record<string, [AnyFunc, AnyFunc]> = {};
  const _eventEmitter = new EventEmitter<YogaManagerEvents>();
  let _stylesToSend: Record<number, Partial<LightningElementStyle>> = {};
  let _numStylesToSend = 0;
  let _needsRender = false;
  const _childOperations = new SimpleDataView(undefined, undefined, _onChildOpsOverflow);

  /**
   * Overflow flush is nodeOps-only — combining pending styles with a
   * partial nodeOps batch would land styles before the remaining nodeOps,
   * targeting nodes that don't exist yet ("node not found" warnings).
   */
  function _onChildOpsOverflow(filledBuffer: ArrayBuffer) {
    worker.postMessage(
      {
        method: 'nodeOperations',
        args: [filledBuffer],
      },
      [filledBuffer],
    );
  }

  function flushSendStyles() {
    // Cheap counter check instead of `Object.keys(_stylesToSend).length` —
    // the latter walks every key in the record on each call.
    if (_numStylesToSend === 0) {
      return;
    }

    // Combine with pending nodeOps — collapses two postMessages into one.
    if (_childOperations.offset > 0) {
      _flushBothInternal();

      return;
    }

    worker.postMessage({
      method: 'applyStyles',
      args: [_stylesToSend, !_needsRender],
    });

    _needsRender = false;
    _stylesToSend = {};
    _numStylesToSend = 0;
  }

  const queueSendStyles = debounceMicrotask(flushSendStyles);

  function applyStyle(
    elementId: number,
    style: Partial<LightningElementStyle> | null,
    skipRender = false,
  ) {
    if (style) {
      let styleToSend = _stylesToSend[elementId];

      if (!styleToSend) {
        _numStylesToSend++;
        styleToSend = {};
        _stylesToSend[elementId] = styleToSend;
      }

      // `for...in` skips Object.entries' tuple allocation — hot path on
      // every applyStyle. Filter non-flex keys here so we don't serialize
      // them, ship them across postMessage, and let the worker re-filter.
      for (const key in style) {
        if (!isFlexStyleProp(key)) {
          continue;
        }

        // oxlint-disable-next-line typescript/no-explicit-any -- intentional: style values can be many shapes; toSerializableValue guards
        const serializedValue = toSerializableValue(key, (style as any)[key]);

        if (serializedValue != null) {
          // @ts-expect-error
          styleToSend[key] = serializedValue;
        }
      }
    } else {
      // Existence check is required — `applyStyle(id, null)` fires from
      // childRemoved regardless of whether anything was buffered, and a
      // counter underflow breaks the > 50 / === 0 thresholds below.
      if (!_stylesToSend[elementId]) {
        return;
      }

      delete _stylesToSend[elementId];
      _numStylesToSend--;
    }

    _needsRender ||= !skipRender;

    if (_numStylesToSend > 50) {
      flushSendStyles();
    } else {
      queueSendStyles();
    }
  }

  function flushChildOperations() {
    const buffer = _childOperations.buffer;

    if (buffer.byteLength === 0) {
      return;
    }

    // Combine with pending styles if any. See `_flushBothInternal`.
    if (_numStylesToSend > 0) {
      _flushBothInternal();

      return;
    }

    worker.postMessage(
      {
        method: 'nodeOperations',
        args: [buffer],
      },
      [buffer],
    );

    _childOperations.reset();
  }

  /**
   * Single 'flushBoth' postMessage — worker applies nodeOps then styles,
   * preserving the causal ordering. Caller must have verified BOTH queues
   * have data; this function blindly transfers and clears.
   */
  function _flushBothInternal() {
    const buffer = _childOperations.buffer;

    worker.postMessage(
      {
        method: 'flushBoth',
        args: [buffer, _stylesToSend, !_needsRender],
      },
      [buffer],
    );

    _childOperations.reset();
    _stylesToSend = {};
    _numStylesToSend = 0;
    _needsRender = false;
  }

  const queueSendNodeOperations = debounceMicrotask(flushChildOperations);

  // Coalesce N synchronous queueRender calls into one postMessage —
  // unmount cascades otherwise produce ~2 messages per destroyed node.
  let _wantsRender = false;
  let _renderElementId = 0;
  let _renderForce = false;

  function flushRender() {
    if (!_wantsRender) {
      return;
    }

    // Capture before flushSendStyles resets _needsRender. When applyStyles
    // ships with skipRender=false the worker auto-renders, so the explicit
    // queueRender below would be redundant.
    const willAutoRender = _numStylesToSend > 0 && _needsRender;

    flushChildOperations();
    flushSendStyles();

    if (!willAutoRender) {
      worker.postMessage({
        method: 'queueRender',
        args: [_renderElementId, _renderForce],
      });
    }

    _wantsRender = false;
    _renderElementId = 0;
    _renderForce = false;
  }

  const queueRenderDrain = debounceMicrotask(flushRender);

  function nodeOperation(
    method:
      | 'addNode'
      | 'removeNode'
      | 'addChildNode'
      | 'detachChildNode'
      | 'addIndependentRoot'
      | 'removeIndependentRoot',
    elementOrParentId: number,
    childId?: number,
    index?: number,
  ) {
    switch (method) {
      case 'addNode':
        _childOperations.writeUint8(NodeOperations.AddNode);
        _childOperations.writeUint32(elementOrParentId);
        break;
      case 'removeNode':
        _childOperations.writeUint8(NodeOperations.RemoveNode);
        _childOperations.writeUint32(elementOrParentId);
        break;
      case 'addIndependentRoot':
        _childOperations.writeUint8(NodeOperations.AddIndependentRoot);
        _childOperations.writeUint32(elementOrParentId);
        break;
      case 'removeIndependentRoot':
        _childOperations.writeUint8(NodeOperations.RemoveIndependentRoot);
        _childOperations.writeUint32(elementOrParentId);
        break;
      case 'addChildNode':
        if (childId === undefined) {
          throw new Error('Child ID must be provided for addChildNode operation');
        }

        _childOperations.writeUint8(
          index === undefined ? NodeOperations.AddChildNode : NodeOperations.AddChildNodeAtIndex,
        );
        _childOperations.writeUint32(elementOrParentId);
        _childOperations.writeUint32(childId);

        if (index !== undefined) {
          _childOperations.writeUint32(index);
        }
        break;
      case 'detachChildNode':
        if (childId === undefined) {
          throw new Error('Child ID must be provided for detachChildNode operation');
        }

        _childOperations.writeUint8(NodeOperations.DetachChildNode);
        _childOperations.writeUint32(elementOrParentId);
        _childOperations.writeUint32(childId);
        break;
      default:
        throw new Error(`Unknown node operation: ${method}`);
    }

    queueSendNodeOperations();
  }

  worker.onmessage = (event: MessageEvent<{ id: string; result?: unknown; error?: string }>) => {
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

  // Used by `init` only — every other call is fire-and-forget on the
  // buffered pipeline. Flushes pending ops/styles for causal ordering.
  function _awaitable(method: string, args: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = getId();

      _callees[id] = [resolve, reject];

      flushChildOperations();
      flushSendStyles();

      worker.postMessage({ id, method, args });
    });
  }

  // Pre-bound methods instead of a Proxy — Proxy.get + closure allocation
  // per node-op call was measurable self-time in VL recycle bursts.
  const proxy = {
    on: _eventEmitter.on.bind(_eventEmitter),
    off: _eventEmitter.off.bind(_eventEmitter),
    applyStyle,
    addNode: (elementId: number) => nodeOperation('addNode', elementId),
    removeNode: (elementId: number) => nodeOperation('removeNode', elementId),
    addChildNode: (parentId: number, childId: number, index?: number) =>
      nodeOperation('addChildNode', parentId, childId, index),
    detachChildNode: (parentId: number, childId: number) =>
      nodeOperation('detachChildNode', parentId, childId),
    queueRender: (elementId: number, force?: boolean) => {
      _wantsRender = true;
      _renderElementId = elementId;
      _renderForce = !!force;
      queueRenderDrain();
    },
    addIndependentRoot: (elementId: number) => nodeOperation('addIndependentRoot', elementId),
    removeIndependentRoot: (elementId: number) => nodeOperation('removeIndependentRoot', elementId),
    init: (yogaOptions?: unknown) => _awaitable('init', [yogaOptions]),
  };

  return proxy as unknown as Workerized<T>;
}

let count = 0;
function getId(): number {
  return ++count;
}

export default (): Workerized<YogaManager> => wrapWorker<YogaManager>(new Worker());

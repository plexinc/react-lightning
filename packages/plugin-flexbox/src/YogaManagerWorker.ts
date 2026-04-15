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
 * Coalesces calls within a single synchronous task. The first call schedules
 * a microtask; subsequent calls before that microtask fires are no-ops (they
 * just keep `latestArgs` updated). At the end of the current synchronous
 * code, the microtask runs `fn` with the latest args.
 *
 * We use a microtask instead of `setTimeout(_, 1)` because the timer's
 * minimum 1ms (and 4ms after nesting) breaks coalescing into many small
 * postMessage flushes during a React commit pass. A microtask collapses a
 * whole commit's worth of writes into one flush.
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
   * Overflow handler for `_childOperations`. Deliberately distinct from
   * `flushChildOperations` (which combines with pending styles): an
   * overflow happens mid-write, so the buffer being flushed is a *partial*
   * batch of node operations. Combining pending styles with this partial
   * batch would land them on the worker before the rest of the nodeOps
   * arrive — styles would target nodes that don't exist yet, causing
   * "node not found" warnings and silently-skipped layout. nodeOps-only
   * here is the only safe choice.
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

    // Combine with pending nodeOps if any. See `_flushBothInternal` for
    // the full reasoning — the short version: this collapses two separate
    // postMessages into one when both flush types fire in the same
    // microtask cycle.
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

      // `for...in` instead of `Object.entries(style)` — avoids the per-call
      // [key, value] tuple array allocation. This loop runs on every
      // applyStyle, which fires hundreds of times during a busy commit.
      //
      // We also short-circuit non-flex keys here. LightningManager.applyStyle
      // is called with the element's full `props.style` from event handlers
      // (`stylesChanged`, `inViewport`, `childAdded`'s parent applyStyle),
      // so the input often contains color/alpha/font/etc. — keys yoga
      // doesn't care about. Filtering here saves: a `toSerializableValue`
      // call per skipped key, the bytes those keys would add to the
      // postMessage payload (structured-clone cost), and the
      // `isFlexStyleProp` check the worker's `applyReactPropsToYoga`
      // would do on the same key anyway.
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
      // Drop a pending entry if one exists. Without the existence check the
      // counter underflows whenever `applyStyle(id, null)` runs for an id
      // with nothing pending — the common case for `childRemoved`, which
      // calls `applyStyle(child.id, null, true)` regardless of whether any
      // style was buffered for that child. A negative counter then breaks
      // the `> 50` early-flush threshold and the `=== 0` short-circuit in
      // `flushSendStyles`.
      if (!_stylesToSend[elementId]) {
        return;
      }

      delete _stylesToSend[elementId];
      _numStylesToSend--;
    }

    _needsRender ||= !skipRender;

    if (_numStylesToSend > 50) {
      // Flush early if the object gets too large
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
   * Drain both pending node operations and pending styles into a single
   * `'flushBoth'` postMessage. The worker handler applies node operations
   * first, then styles — preserving the causal ordering the two-message
   * setup enforced by hand (`flushChildOperations()` before
   * `flushSendStyles()` posted `applyStyles`).
   *
   * Caller must have verified that BOTH queues have data; this function
   * blindly transfers/clears both. The overflow handler
   * (`_onChildOpsOverflow`) intentionally bypasses this and posts
   * nodeOps-only, since combining at overflow would land pre-overflow
   * styles on the worker before the rest of the nodeOps catch up.
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

  // Coalesce N synchronous `queueRender` calls into a single postMessage.
  // During React unmount cascades the prior fire-immediate path produced
  // ~2 postMessages per destroyed node (a flush + a queueRender). With
  // these state vars + the debounced drain below, all `queueRender`s in a
  // sync block collapse into one message at end-of-microtask.
  let _wantsRender = false;
  let _renderElementId = 0;
  let _renderForce = false;

  function flushRender() {
    if (!_wantsRender) {
      return;
    }

    // Capture before flushSendStyles resets `_needsRender`. When pending
    // styles are flushed with skipRender=false (i.e. `_needsRender` was
    // true), `applyStyles` on the worker auto-triggers `queueRender`
    // already — so the explicit message below is redundant and we skip it.
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

  // Awaitable: flush pending ops/styles for causal ordering, then post
  // the call and register a callee so the caller can `await` the worker's
  // response. Used only by `init` — every other call from
  // LightningManager is fire-and-forget and rides the buffered nodeOps
  // pipeline (see `nodeOperation`) or the debounced render drain.
  function _awaitable(method: string, args: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = getId();

      _callees[id] = [resolve, reject];

      flushChildOperations();
      flushSendStyles();

      worker.postMessage({ id, method, args });
    });
  }

  // Plain object with pre-bound methods instead of a `Proxy`. The Proxy
  // version did `Proxy.get` + a string-compare chain + a fresh
  // `(...args) => nodeOperation(prop, ...args)` closure allocation per
  // node-op call — measurable self-time during VL recycle bursts.
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
    removeIndependentRoot: (elementId: number) =>
      nodeOperation('removeIndependentRoot', elementId),
    init: (yogaOptions?: unknown) => _awaitable('init', [yogaOptions]),
  };

  return proxy as unknown as Workerized<T>;
}

let count = 0;
function getId(): number {
  return ++count;
}

export default (): Workerized<YogaManager> => wrapWorker<YogaManager>(new Worker());

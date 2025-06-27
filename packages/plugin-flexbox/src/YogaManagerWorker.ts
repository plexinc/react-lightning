import { EventEmitter } from 'tseep';
import Worker from './worker?worker';
import type { YogaManager, YogaManagerEvents } from './YogaManager';

// biome-ignore lint/suspicious/noExplicitAny: Basic type for function signatures
type AnyFunc = (...args: any[]) => any;

export type Workerized<T> = {
  [K in keyof T]: T[K] extends AnyFunc
    ? ReturnType<T[K]> extends PromiseLike<unknown>
      ? T[K]
      : (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
    : never;
};

function wrapWorker<T>(worker: Worker): Workerized<T> {
  const callees: Record<string, [AnyFunc, AnyFunc]> = {};
  const eventEmitter = new EventEmitter<YogaManagerEvents>();

  worker.onmessage = (
    event: MessageEvent<{ id: string; result?: unknown; error?: string }>,
  ) => {
    const { id, result, error } = event.data;

    if (id === 'render') {
      // Special case for render updates
      eventEmitter.emit('render', result as ArrayBuffer);
      return;
    }

    const callee = callees[id];

    if (!callee) {
      console.error(`No handler found for worker message id: ${id}`);
      return;
    }

    const [resolve, reject] = callee;

    delete callees[id];

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
        return eventEmitter.on.bind(eventEmitter);
      } else if (prop === 'off') {
        return eventEmitter.off.bind(eventEmitter);
      }

      return (...args: unknown[]) =>
        new Promise((resolve, reject) => {
          const id = getId();

          callees[id] = [resolve, reject];

          worker.postMessage({ id, method: prop, args });
        });
    },
  });

  return proxy;
}

let count = 0;
function getId(): string {
  return (++count).toString();
}

export default wrapWorker<YogaManager>(new Worker());

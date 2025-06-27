import { YogaManager } from './YogaManager';

const manager = new YogaManager();

manager.on('render', (buffer) => {
  self.postMessage({ id: 'render', result: buffer }, [buffer]);
});

self.onmessage = async (
  event: MessageEvent<{
    id: string;
    method: keyof typeof manager;
    args?: unknown[];
  }>,
) => {
  const { id, method, args } = event.data;

  if (method === 'queueRender') {
    manager.queueRender(args?.[0] as number);
  }

  try {
    if (typeof manager[method] === 'function') {
      // @ts-expect-error Dynamic method call
      let result: Promise<unknown> | null | unknown = manager[method].apply(
        manager,
        args,
      );

      if (result != null && typeof result === 'object' && 'then' in result) {
        result = await (result as Promise<unknown>);
      }

      self.postMessage({ id, result });
    } else {
      self.postMessage({ id, error: `Method ${method} is not a function` });
    }
  } catch (error) {
    const message =
      typeof error === 'string' ? error : (error as Error).message;

    self.postMessage({ id, error: message });
  }
};

export default {};

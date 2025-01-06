// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type EventHandler = (...args: any[]) => void;

export function useComposedEventHandler(...handlers: EventHandler[]) {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  return (...args: any[]) => {
    for (const handler of handlers) {
      handler(...args);
    }
  };
}

// biome-ignore-all lint/suspicious/noExplicitAny: Valid use of any here
type EventHandler = (...args: any[]) => void;

export function useComposedEventHandler(...handlers: EventHandler[]) {
  return (...args: any[]): void => {
    for (const handler of handlers) {
      handler(...args);
    }
  };
}

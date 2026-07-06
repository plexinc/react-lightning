// oxlint-disable typescript/no-explicit-any -- Valid use of any here
type EventHandler = (...args: any[]) => void;

// Mirrors reanimated's public API: a single array of handlers, not rest args.
export function useComposedEventHandler(
  handlers: (EventHandler | null | undefined)[],
) {
  return (...args: any[]): void => {
    for (const handler of handlers) {
      if (typeof handler === 'function') {
        handler(...args);
      }
    }
  };
}

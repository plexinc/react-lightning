export function traceWrap<T extends object>(obj: T, skipTrace = false) {
  const copy = { ...obj };

  for (const key in copy) {
    const func = copy[key];
    const isFunc = typeof func === 'function';

    if (isFunc) {
      // @ts-expect-error TODO: Fix this typing, but it's just a debug helper
      copy[key] = (...args) => {
        console.group(key);
        console.info(...args);
        if (!skipTrace) {
          console.trace('Stack:');
        }

        const result = func(...args);
        console.info('Result:', result);
        console.groupEnd();

        return result;
      };
    }
  }

  return copy;
}

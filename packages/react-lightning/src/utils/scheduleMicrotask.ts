// queueMicrotask needs Chrome 71; webOS 5 and Tizen 5.x ship older Chromes.
export const scheduleMicrotask: (callback: () => void) => void =
  typeof queueMicrotask === 'function'
    ? (callback) => queueMicrotask(callback)
    : (callback) => {
        void Promise.resolve().then(callback);
      };

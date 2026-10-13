const noop = (): void => {};

export const render: () => void = noop;
export const hydrate: () => void = noop;
export const unmountComponentAtNode = (): boolean => false;
export const createPortal = <T>(children: T): T => children;
export const flushSync = <T>(fn: () => T): T | undefined => fn?.();
export const findDOMNode = (): null => null;
export const unstable_batchedUpdates = <A, R>(fn: (a: A) => R, a: A): R => fn(a);
export const version: string = '19.0.0';

const reactDom: {
  render: typeof render;
  hydrate: typeof hydrate;
  unmountComponentAtNode: typeof unmountComponentAtNode;
  createPortal: typeof createPortal;
  flushSync: typeof flushSync;
  findDOMNode: typeof findDOMNode;
  unstable_batchedUpdates: typeof unstable_batchedUpdates;
  version: string;
} = {
  render,
  hydrate,
  unmountComponentAtNode,
  createPortal,
  flushSync,
  findDOMNode,
  unstable_batchedUpdates,
  version,
};

export default reactDom;

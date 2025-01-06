// Based off React-reconciler's implementation
// https://github.com/facebook/react/blob/main/packages/shared/getComponentNameFromType.js

import {
  isContextConsumer,
  isContextProvider,
  isForwardRef,
  isFragment,
  isLazy,
  isMemo,
  isPortal,
  isProfiler,
  isStrictMode,
  isSuspense,
} from 'react-is';
import { getContextName } from './getContextName';
import { getWrappedName } from './getWrappedName';

const REACT_CLIENT_REFERENCE = Symbol.for('react.client.reference');

// Note that the reconciler package should generally prefer to use getComponentNameFromFiber() instead.
export default function getComponentNameFromType(type: unknown): string | null {
  if (type == null) {
    // Host root, text node or just invalid type.
    return null;
  }
  if (typeof type === 'function') {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    if ((type as any).$$typeof === REACT_CLIENT_REFERENCE) {
      // TODO: Create a convention for naming client references with debug info.
      return null;
    }
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return (type as any).displayName || type.name || null;
  }
  if (typeof type === 'string') {
    return type;
  }

  if (isFragment(type)) {
    return 'Fragment';
  }
  if (isPortal(type)) {
    return 'Portal';
  }
  if (isProfiler(type)) {
    return 'Profiler';
  }
  if (isStrictMode(type)) {
    return 'StrictMode';
  }
  if (isSuspense(type)) {
    return 'Suspense';
  }

  if (typeof type === 'object') {
    // if (__DEV__) {
    //   if (typeof (type as any).tag === 'number') {
    //     console.error(
    //       'Received an unexpected object in getComponentNameFromType(). ' +
    //         'This is likely a bug in React. Please file an issue.',
    //     );
    //   }
    // }

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const $$typeof = (type as any).$$typeof;

    if (isContextProvider($$typeof)) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return `${getContextName(type as any)}.Provider`;
    }
    if (isContextConsumer($$typeof)) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return `${getContextName(type as any)}.Consumer`;
    }
    if (isForwardRef($$typeof)) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return getWrappedName(type, (type as any).render, 'ForwardRef');
    }
    if (isMemo($$typeof)) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const outerName = (type as any).displayName || null;
      if (outerName !== null) {
        return outerName;
      }
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return getComponentNameFromType((type as any).type) || 'Memo';
    }
    if (isLazy($$typeof)) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const lazyComponent = type as any;
      const payload = lazyComponent._payload;
      const init = lazyComponent._init;
      try {
        return getComponentNameFromType(init(payload));
      } catch (err) {
        console.warn('Unable to get lazy component name', err);
        return null;
      }
    }
  }

  return null;
}

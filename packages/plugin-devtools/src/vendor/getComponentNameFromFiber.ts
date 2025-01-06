// Based off React-reconciler's implementation
// https://github.com/facebook/react/blob/main/packages/react-reconciler/src/getComponentNameFromFiber.js

import type { Fiber } from 'react-reconciler';

import { isStrictMode } from 'react-is';
import {
  CacheComponent,
  ClassComponent,
  ContextConsumer,
  ContextProvider,
  DehydratedFragment,
  ForwardRef,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostHoistable,
  HostPortal,
  HostRoot,
  HostSingleton,
  HostText,
  IncompleteClassComponent,
  IncompleteFunctionComponent,
  LazyComponent,
  LegacyHiddenComponent,
  MemoComponent,
  Mode,
  OffscreenComponent,
  Profiler,
  ScopeComponent,
  SimpleMemoComponent,
  SuspenseComponent,
  SuspenseListComponent,
  Throw,
  TracingMarkerComponent,
} from './ReactWorkTags';
import getComponentNameFromType from './getComponentNameFromType';
import { getContextName } from './getContextName';
import { getWrappedName } from './getWrappedName';

const disableLegacyMode = true;
const enableLegacyHidden = false;

export default function getComponentNameFromFiber(
  fiber?: Fiber,
  useRawName?: boolean,
): string | null {
  if (!fiber) {
    return null;
  }

  let { tag, type } = fiber;

  if (
    typeof type === 'string' &&
    fiber.return &&
    typeof fiber.return.type !== 'string' &&
    !useRawName
  ) {
    tag = fiber.return.tag;
    type = fiber.return.type;
  }

  switch (tag) {
    case CacheComponent:
      return 'Cache';
    case ContextConsumer:
      return `${getContextName(type)}.Consumer`;
    case ContextProvider:
      return `${getContextName(type)}.Provider`;
    case DehydratedFragment:
      return 'DehydratedFragment';
    case ForwardRef:
      return getWrappedName(type, type.render, 'ForwardRef');
    case Fragment:
      return 'Fragment';
    // @ts-expect-error Version mismatch
    case HostHoistable:
    // @ts-expect-error Version mismatch
    case HostSingleton:
    case HostComponent:
      // Host component type is the display name (e.g. "div", "View")
      return type;
    case HostPortal:
      return 'Portal';
    case HostRoot:
      return 'Root';
    case HostText:
      return 'Text';
    case LazyComponent:
      // Name comes from the type in this case; we don't have a tag.
      return getComponentNameFromType(type);
    case Mode:
      if (isStrictMode(type)) {
        // Don't be less specific than shared/getComponentNameFromType
        return 'StrictMode';
      }
      return 'Mode';
    case OffscreenComponent:
      return 'Offscreen';
    case Profiler:
      return 'Profiler';
    case ScopeComponent:
      return 'Scope';
    case SuspenseComponent:
      return 'Suspense';
    case SuspenseListComponent:
      return 'SuspenseList';
    // @ts-expect-error Version mismatch

    case TracingMarkerComponent:
      return 'TracingMarker';
    // The display name for these tags come from the user-provided type:
    case IncompleteClassComponent:
    // @ts-expect-error Version mismatch
    // biome-ignore lint/suspicious/noFallthroughSwitchClause: This is how it works in the original implementation
    case IncompleteFunctionComponent:
      if (disableLegacyMode) {
        break;
      }
    // Fallthrough
    case ClassComponent:
    case FunctionComponent:
    case MemoComponent:
    case SimpleMemoComponent:
      if (typeof type === 'function') {
        return type.displayName || type.name || null;
      }
      if (typeof type === 'string') {
        return type;
      }
      break;
    case LegacyHiddenComponent:
      if (enableLegacyHidden) {
        return 'LegacyHidden';
      }
      break;
    // @ts-expect-error Version mismatch
    case Throw: {
      // if (__DEV__) {
      //   // For an error in child position we use the name of the inner most parent component.
      //   // Whether a Server Component or the parent Fiber.
      //   const debugInfo = fiber._debugInfo;
      //   if (debugInfo != null) {
      //     for (let i = debugInfo.length - 1; i >= 0; i--) {
      //       if (typeof debugInfo[i].name === 'string') {
      //         return debugInfo[i].name;
      //       }
      //     }
      //   }
      //   if (fiber.return === null) {
      //     return null;
      //   }
      //   return getComponentNameFromFiber(fiber.return);
      // }
      return null;
    }
  }

  return null;
}

import { type ReactNode, createContext } from 'react';
import createReconciler, { type ReactContext } from 'react-reconciler';
import { DiscreteEventPriority, NoEventPriority } from 'react-reconciler/constants';

const noop = () => {};

// Bare host config: nothing paints, only scheduling and effects matter. Every
// update is sync so tests can flush in place.
export type TestRenderer = {
  render: (element: ReactNode) => void;
  flush: () => void;
};

export function createTestRenderer(): TestRenderer {
  const transitionContext = createContext(null);
  let priority: number = NoEventPriority;

  // oxlint-disable-next-line typescript/no-explicit-any -- test-only host config, nothing is a real instance
  const reconciler = createReconciler<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >({
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    isPrimaryRenderer: false,
    warnsIfNotActing: false,
    supportsMicrotasks: true,
    scheduleMicrotask: queueMicrotask,
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: -1,
    getRootHostContext: () => ({}),
    getChildHostContext: (ctx: unknown) => ctx,
    getPublicInstance: (instance: unknown) => instance,
    createInstance: () => ({ node: { x: 0, y: 0, w: 0, h: 0 } }),
    createTextInstance: () => ({}),
    appendInitialChild: noop,
    appendChild: noop,
    appendChildToContainer: noop,
    insertBefore: noop,
    insertInContainerBefore: noop,
    removeChild: noop,
    removeChildFromContainer: noop,
    clearContainer: noop,
    commitUpdate: noop,
    commitTextUpdate: noop,
    hideInstance: noop,
    unhideInstance: noop,
    hideTextInstance: noop,
    unhideTextInstance: noop,
    detachDeletedInstance: noop,
    finalizeInitialChildren: () => false,
    prepareForCommit: () => null,
    resetAfterCommit: noop,
    shouldSetTextContent: () => false,
    preparePortalMount: noop,
    getInstanceFromNode: () => null,
    beforeActiveInstanceBlur: noop,
    afterActiveInstanceBlur: noop,
    prepareScopeUpdate: noop,
    getInstanceFromScope: () => null,
    resetFormInstance: noop,
    requestPostPaintCallback: noop,
    shouldAttemptEagerTransition: () => false,
    trackSchedulerEvent: noop,
    resolveEventType: () => null,
    resolveEventTimeStamp: () => -1.1,
    maySuspendCommit: () => false,
    startSuspendingCommit: noop,
    suspendInstance: noop,
    preloadInstance: () => true,
    waitForCommitToBeReady: () => null,
    setCurrentUpdatePriority: (next: number) => {
      priority = next;
    },
    getCurrentUpdatePriority: () => priority,
    resolveUpdatePriority: () => (priority !== NoEventPriority ? priority : DiscreteEventPriority),
    NotPendingTransition: null,
    // React's own context object carries the internal fields the typings ask for.
    HostTransitionContext: transitionContext as unknown as ReactContext<null>,
  });

  const container = reconciler.createContainer(
    {},
    0,
    null,
    false,
    null,
    '',
    noop,
    noop,
    noop,
    noop,
  );

  return {
    render: (element) => {
      reconciler.updateContainerSync(element, container, null, null);
      reconciler.flushSyncWork();
    },
    flush: () => reconciler.flushSyncWork(),
  };
}

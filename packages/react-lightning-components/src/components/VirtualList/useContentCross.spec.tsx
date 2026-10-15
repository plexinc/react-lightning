import { Activity, createContext } from 'react';
import createReconciler, { type ReactContext } from 'react-reconciler';
import { DiscreteEventPriority, NoEventPriority } from 'react-reconciler/constants';
import { describe, expect, it } from 'vitest';

import { type ContentCross, useContentCross } from './useContentCross';

const noop = () => {};

// Bare host config: the probe renders nothing, so only the scheduling and
// effect machinery matters. Every update is sync so tests can flush in place.
function createTestRenderer() {
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
    getRootHostContext: () => null,
    getChildHostContext: (ctx: unknown) => ctx,
    getPublicInstance: (instance: unknown) => instance,
    createInstance: () => ({}),
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
    render: (element: Parameters<typeof reconciler.updateContainerSync>[0]) => {
      reconciler.updateContainerSync(element, container, null, null);
      reconciler.flushSyncWork();
    },
    flush: () => reconciler.flushSyncWork(),
  };
}

function setup() {
  const { render, flush } = createTestRenderer();
  let current: ContentCross | undefined;

  function Probe({ data, extraData }: { data: unknown; extraData?: unknown }) {
    current = useContentCross(data, extraData);

    return null;
  }

  const renderList = (data: unknown, mode: 'visible' | 'hidden' = 'visible', extraData?: unknown) =>
    render(
      <Activity mode={mode}>
        <Probe data={data} extraData={extraData} />
      </Activity>,
    );

  const report = (size: number) => {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- set by the first render
    current!.handleContentCrossLayout(size);
    flush();
  };

  // oxlint-disable-next-line typescript/no-non-null-assertion -- set by the first render
  return { renderList, report, latest: () => current! };
}

describe('useContentCross', () => {
  it('keeps the cross size when layout effects re-run without a data change', () => {
    const { renderList, report, latest } = setup();
    const data = [1, 2, 3];

    renderList(data);
    report(928);

    expect(latest().maxContentCross).toBe(928);
    const generation = latest().crossGeneration;

    // Hiding and revealing tears down and re-runs layout effects, the way a
    // Suspense-based freeze does when a covered screen comes back.
    renderList(data, 'hidden');
    renderList(data, 'visible');

    expect(latest().maxContentCross).toBe(928);
    expect(latest().crossGeneration).toBe(generation);
  });

  it('resets the cross size when data identity changes', () => {
    const { renderList, report, latest } = setup();

    renderList([1, 2, 3]);
    report(928);
    const generation = latest().crossGeneration;

    renderList([1, 2, 3]);

    expect(latest().maxContentCross).toBe(0);
    expect(latest().crossGeneration).toBe(generation + 1);
  });

  it('resets the cross size when extraData changes', () => {
    const { renderList, report, latest } = setup();
    const data = [1, 2, 3];

    renderList(data, 'visible', 'a');
    report(928);
    const generation = latest().crossGeneration;

    renderList(data, 'visible', 'b');

    expect(latest().maxContentCross).toBe(0);
    expect(latest().crossGeneration).toBe(generation + 1);
  });

  it('only grows within a dataset', () => {
    const { renderList, report, latest } = setup();
    const data = [1, 2, 3];

    renderList(data);
    report(928);
    report(672);

    expect(latest().maxContentCross).toBe(928);
  });
});

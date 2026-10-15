import { createContext } from 'react';
import type { EventPriority, HostConfig } from 'react-reconciler';
import { DefaultEventPriority, NoEventPriority } from 'react-reconciler/constants';

import { KIND_IMAGE, KIND_RAW_TEXT, KIND_TEXT, KIND_VIEW, type SceneNode } from '../SceneNode';
import type { Stage } from '../Stage';
import { applyProps, isTextContent } from './applyProps';

type Props = Record<string, unknown>;

export type Container = { stage: Stage };

// queueMicrotask is Chrome 71+.
const scheduleMicrotask: (fn: () => void) => void =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn) => {
        Promise.resolve().then(fn);
      };

function kindOf(type: string): number {
  switch (type) {
    case 'lng-text':
    case 'text':
      return KIND_TEXT;
    case 'lng-image':
    case 'image':
      return KIND_IMAGE;
    default:
      return KIND_VIEW;
  }
}

export function createHostConfig(): HostConfig<
  string,
  Props,
  Container,
  SceneNode,
  SceneNode,
  SceneNode,
  SceneNode,
  null,
  SceneNode,
  Container,
  unknown,
  unknown,
  unknown,
  unknown
> {
  const HostTransitionContext = createContext(null);
  let priority: EventPriority = NoEventPriority;

  return {
    isPrimaryRenderer: true,
    warnsIfNotActing: false,
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    supportsMicrotasks: true,
    scheduleMicrotask,
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: -1,
    preparePortalMount: () => {},
    getInstanceFromNode: () => null,
    beforeActiveInstanceBlur: () => {},
    afterActiveInstanceBlur: () => {},
    prepareScopeUpdate: () => {},
    resetFormInstance: () => {},
    requestPostPaintCallback: () => {},
    shouldAttemptEagerTransition: () => false,
    trackSchedulerEvent: () => {},
    resolveEventType: () => null,
    resolveEventTimeStamp: () => -1.1,
    maySuspendCommit: () => false,
    startSuspendingCommit: () => {},
    suspendInstance: () => {},
    preloadInstance: () => true,
    waitForCommitToBeReady: () => null,
    NotPendingTransition: null,
    HostTransitionContext: {
      $$typeof: HostTransitionContext.$$typeof,
      Provider: null as never,
      Consumer: null as never,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0,
    },
    getRootHostContext: (c) => c,
    getChildHostContext: (parent) => parent,
    getPublicInstance: (i) => i,
    getInstanceFromScope: (i) => i as SceneNode,

    createInstance(type, props, container) {
      const node = container.stage.createNode(kindOf(type));

      applyProps(node, null, props);

      return node;
    },

    createTextInstance(text, container) {
      // Stray text outside a <lng-text>; kept in the tree for ordering, never drawn.
      const node = container.stage.createNode(KIND_RAW_TEXT);

      node.text = text;

      return node;
    },

    shouldSetTextContent: (type, props) =>
      kindOf(type) === KIND_TEXT && isTextContent(props.children),
    finalizeInitialChildren: () => false,
    prepareForCommit: () => null,
    resetAfterCommit: () => {},
    resetTextContent: () => {},
    clearContainer: () => {},

    appendInitialChild: (parent, child) => parent.insertBefore(child, null),
    appendChild: (parent, child) => parent.insertBefore(child, null),
    appendChildToContainer: (container, child) => container.stage.root.insertBefore(child, null),
    insertBefore: (parent, child, before) => parent.insertBefore(child, before),
    insertInContainerBefore: (container, child, before) =>
      container.stage.root.insertBefore(child, before),
    removeChild: (parent, child) => parent.removeChild(child),
    removeChildFromContainer: (container, child) => container.stage.root.removeChild(child),
    detachDeletedInstance: (node) => node.destroy(),

    commitUpdate(node, _type, oldProps, newProps) {
      applyProps(node, oldProps, newProps);
    },

    commitTextUpdate(node, _old, text) {
      node.text = text;
    },

    hideInstance(node) {
      node.visible = false;
      node.invalidate(2);
    },
    unhideInstance(node) {
      node.visible = true;
      node.invalidate(2);
    },
    hideTextInstance: () => {},
    unhideTextInstance: () => {},

    setCurrentUpdatePriority(p) {
      priority = p;
    },
    getCurrentUpdatePriority: () => priority,
    resolveUpdatePriority: () => (priority !== NoEventPriority ? priority : DefaultEventPriority),
  };
}

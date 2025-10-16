import type { RendererMain } from '@lightningjs/renderer';
import { createContext } from 'react';
import type { EventPriority, HostConfig } from 'react-reconciler';
import {
  DefaultEventPriority,
  NoEventPriority,
} from 'react-reconciler/constants';
import { createLightningElement } from '../element/createLightningElement';
import { LightningTextElement } from '../element/LightningTextElement';
import {
  type LightningElement,
  type LightningElementProps,
  LightningElementType,
  type RendererNode,
} from '../types';
import { simpleDiff } from '../utils/simpleDiff';
import { mapReactPropsToLightning } from './mapReactPropsToLightning';
import type { Plugin } from './Plugin';

export type ReconcilerContainer = {
  renderer: RendererMain;
  plugins: Plugin<LightningElement>[];
};

export type LightningHostConfig = HostConfig<
  LightningElementType,
  LightningElementProps,
  ReconcilerContainer,
  LightningElement,
  LightningTextElement,
  null,
  null,
  null,
  LightningElement,
  ReconcilerContainer,
  unknown,
  unknown,
  unknown,
  unknown
>;

type LightningHostConfigOptions = Pick<
  LightningHostConfig,
  'isPrimaryRenderer'
>;

export function createHostConfig(
  options?: LightningHostConfigOptions,
): LightningHostConfig {
  const HostTransitionContext = createContext(null);
  let currentUpdatePriority: EventPriority = NoEventPriority;

  function appendChild(
    parentInstance: LightningElement,
    child: LightningElement,
  ) {
    if (child.parent !== parentInstance) {
      parentInstance.insertChild(child);
    }
  }

  return {
    isPrimaryRenderer: options?.isPrimaryRenderer ?? true,
    warnsIfNotActing: false,
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    supportsMicrotasks: true,
    scheduleMicrotask: queueMicrotask,
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
      // biome-ignore lint/suspicious/noExplicitAny: Needs to be null
      Provider: null as any,
      // biome-ignore lint/suspicious/noExplicitAny: Needs to be null
      Consumer: null as any,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0,
    },

    getRootHostContext(container) {
      return container;
    },

    getChildHostContext(parentHostContext) {
      return parentHostContext;
    },

    getPublicInstance(instance) {
      return instance;
    },

    appendInitialChild: appendChild,
    appendChild,

    appendChildToContainer(container, child) {
      if (container.renderer.root) {
        const root = container.renderer
          .root as unknown as RendererNode<LightningElement>;

        child.setLightningNode(root);

        // biome-ignore lint/suspicious/noExplicitAny: TODO
        (window as any).rootElement = child;
      }
    },

    createInstance(type, props, _rootContainerInstance, container, fiber) {
      const lngProps = mapReactPropsToLightning(type, props);
      const instance = createLightningElement(
        type,
        lngProps,
        container.renderer,
        container.plugins,
        fiber,
      );

      return instance;
    },

    createTextInstance(text, _rootContainerInstance, container, fiber) {
      return new LightningTextElement(
        { text },
        container.renderer,
        container.plugins,
        fiber,
      );
    },

    finalizeInitialChildren() {
      return false;
    },

    prepareForCommit() {
      return null;
    },

    resetAfterCommit() {
      // Noop
    },

    resetTextContent(instance) {
      if (instance.isTextElement) {
        (instance as LightningTextElement).text = '';
      }
    },

    getInstanceFromScope(instance) {
      return instance as LightningElement;
    },

    shouldSetTextContent(type) {
      return type === LightningElementType.Text;
    },

    setCurrentUpdatePriority(newPriority: EventPriority): void {
      currentUpdatePriority = newPriority;
    },

    getCurrentUpdatePriority(): EventPriority {
      return currentUpdatePriority;
    },

    resolveUpdatePriority() {
      if (currentUpdatePriority !== NoEventPriority) {
        return currentUpdatePriority;
      }

      return DefaultEventPriority;
    },

    insertBefore(parentInstance, child, beforeChild) {
      if (child === beforeChild) {
        throw new Error('Can not insert node before itself');
      }

      parentInstance.insertChild(child, beforeChild);
    },

    insertInContainerBefore() {},

    removeChild(parentInstance, child) {
      if (child) {
        parentInstance.removeChild(child);
      }
    },

    clearContainer() {},

    removeChildFromContainer() {},

    detachDeletedInstance(instance) {
      instance.destroy();
    },

    commitUpdate(instance, type, oldProps, newProps) {
      const diffedProps: Partial<LightningElementProps> | null = simpleDiff(
        oldProps,
        newProps,
      );

      if (!diffedProps) {
        return null;
      }

      const updatePayload = mapReactPropsToLightning(type, diffedProps);

      if (!updatePayload || Object.keys(updatePayload).length === 0) {
        return null;
      }

      instance.setProps(updatePayload);
    },

    commitTextUpdate(instance, oldText, newText) {
      if (instance.isTextElement && oldText !== newText) {
        instance.text = newText;
      }
    },

    hideInstance(instance) {
      instance.style.alpha = 0;
    },

    hideTextInstance(textInstance) {
      textInstance.style.alpha = 0;
    },

    unhideInstance(instance) {
      // Probably need to make this a different property so that we don't
      // override user-specified alpha values
      instance.style.alpha = 1;
    },

    unhideTextInstance(textInstance): void {
      textInstance.style.alpha = 1;
    },
  };
}

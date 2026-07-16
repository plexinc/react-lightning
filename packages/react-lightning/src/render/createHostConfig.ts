import type { RendererMain } from '@lightningjs/renderer';
import { createContext } from 'react';
import type { EventPriority, HostConfig } from 'react-reconciler';
import { DefaultEventPriority, NoEventPriority } from 'react-reconciler/constants';

import { createLightningElement } from '../element/createLightningElement';
import { LightningTextElement } from '../element/LightningTextElement';
import {
  type LightningElement,
  type LightningElementProps,
  LightningElementType,
  type RendererNode,
} from '../types';
import { simpleDiff } from '../utils/simpleDiff';
import { isPrimitiveTextContent } from './isValidTextChild';
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
> & {
  rendererPackageName: string;
  rendererVersion: string;
  extraDevToolsConfig: unknown;
};

type LightningHostConfigOptions = Pick<LightningHostConfig, 'isPrimaryRenderer'>;

export function createHostConfig(options?: LightningHostConfigOptions): LightningHostConfig {
  const HostTransitionContext = createContext(null);
  let currentUpdatePriority: EventPriority = NoEventPriority;

  function appendChild(parentInstance: LightningElement, child: LightningElement) {
    if (child.parent !== parentInstance) {
      parentInstance.insertChild(child);
    }
  }

  return {
    isPrimaryRenderer: options?.isPrimaryRenderer ?? true,
    warnsIfNotActing: false,

    // React DevTools integration — read by react-reconciler's
    // injectIntoDevTools() to identify this renderer.
    rendererPackageName: '@plextv/react-lightning',
    rendererVersion: '0.4.0',
    extraDevToolsConfig: null,
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
      // oxlint-disable-next-line typescript/no-explicit-any -- Needs to be null
      Provider: null as any,
      // oxlint-disable-next-line typescript/no-explicit-any -- Needs to be null
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
        const root = container.renderer.root as unknown as RendererNode<LightningElement>;

        child.setLightningNode(root);

        // oxlint-disable-next-line typescript/no-explicit-any -- TODO
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
      return new LightningTextElement({ text }, container.renderer, container.plugins, fiber);
    },

    finalizeInitialChildren() {
      return false;
    },

    prepareForCommit() {
      return null;
    },

    resetAfterCommit() {
      return {};
    },

    resetTextContent(instance) {
      if (instance.isTextElement) {
        (instance as LightningTextElement).text = '';
      }
    },

    getInstanceFromScope(instance) {
      return instance as LightningElement;
    },

    shouldSetTextContent(type, props) {
      // For text elements we normally take over their children as raw text
      // content (the fast path — no child reconciliation). But that swallows
      // children React still needs to render: a `<FormattedMessage>` only
      // becomes a translated, interpolated string once React renders it. So
      // when the children aren't already a flat string, return false and let
      // the reconciler render them; their text is folded back into the node by
      // `LightningTextElement` as the string children are appended.
      return (
        type === LightningElementType.Text &&
        isPrimitiveTextContent((props as LightningElementProps)?.children)
      );
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
      const diffedProps: Partial<LightningElementProps> | null = simpleDiff(oldProps, newProps);

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

        // When this text instance is a child fragment of a parent text element
        // (e.g. the string a `<FormattedMessage>` resolved to), the parent owns
        // the rendered text and must re-fold its children after the update.
        const parent = instance.parent;
        if (parent?.isTextElement) {
          (parent as LightningTextElement).recomputeChildText();
        }
      }
    },

    hideInstance(instance) {
      instance.setReactHidden(true);
    },

    hideTextInstance(textInstance) {
      textInstance.setReactHidden(true);
    },

    unhideInstance(instance, props) {
      instance.setReactHidden(false, props);
    },

    unhideTextInstance(textInstance): void {
      textInstance.setReactHidden(false);
    },
  };
}

import type { RendererMain } from '@lightningjs/renderer';
import type { HostConfig } from 'react-reconciler';
import { DiscreteEventPriority } from 'react-reconciler/constants';
import { createLightningElement } from '../element/createLightningElement';
import { LightningTextElement } from '../element/LightningTextElement';
import {
  type LightningElement,
  type LightningElementProps,
  LightningElementType,
  type LightningTextElementProps,
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
  LightningElement,
  ReconcilerContainer,
  LightningElementProps,
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

    prepareUpdate(_instance, type, oldProps, newProps) {
      const diffedProps: Partial<LightningElementProps> | null = simpleDiff(
        oldProps,
        newProps,
      );

      return diffedProps ? mapReactPropsToLightning(type, diffedProps) : null;
    },

    getInstanceFromScope(instance) {
      return instance as LightningElement;
    },

    shouldSetTextContent(type) {
      return type === LightningElementType.Text;
    },

    getCurrentEventPriority() {
      return DiscreteEventPriority;
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

    commitUpdate(instance, updatePayload) {
      if (Object.keys(updatePayload).length === 0) {
        return null;
      }

      instance.setProps(updatePayload as LightningTextElementProps);
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

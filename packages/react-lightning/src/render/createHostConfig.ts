import type { RendererMain } from '@lightningjs/renderer';
import type { HostConfig } from 'react-reconciler';
import { DiscreteEventPriority } from 'react-reconciler/constants';
import { LightningTextElement } from '../element/LightningTextElement';
import { createLightningElement } from '../element/createLightningElement';
import {
  type LightningElement,
  type LightningElementProps,
  LightningElementType,
  type LightningTextElementProps,
  type RendererNode,
} from '../types';
import { simpleDiff } from '../utils/simpleDiff';
import type { Plugin } from './Plugin';
import { mapReactPropsToLightning } from './mapReactPropsToLightning';

export type LightningHostConfig = HostConfig<
  LightningElementType,
  LightningElementProps,
  RendererMain,
  LightningElement,
  LightningTextElement,
  null,
  null,
  LightningElement,
  unknown,
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
  renderer: RendererMain,
  plugins: Plugin<LightningElement>[],
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

    getRootHostContext() {
      return renderer;
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
      if (container.root) {
        const oldNode = child.node;
        const root =
          container.root as unknown as RendererNode<LightningElement>;

        root.container = child;

        child.node = root;

        for (const c of child.children) {
          c.parent = child;
        }

        // biome-ignore lint/suspicious/noExplicitAny: TODO
        (window as any).rootElement = child;

        oldNode.destroy();
      }
    },

    createInstance(type, props, _rootContainerInstance, _hostContext, fiber) {
      const lngProps = mapReactPropsToLightning(type, props);
      const instance = createLightningElement(
        type,
        lngProps,
        renderer,
        plugins,
        fiber,
      );

      return instance;
    },

    createTextInstance(text, _rootContainerInstance, _hostContext, fiber) {
      return new LightningTextElement({ text }, renderer, plugins, fiber);
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
      let diffedProps: Partial<LightningElementProps> | null = simpleDiff(
        oldProps,
        newProps,
        { ignore: ['children'] },
      );

      if (newProps.children && newProps.children !== oldProps.children) {
        if (diffedProps === null) {
          diffedProps = {
            children: newProps.children,
          };
        } else {
          diffedProps.children = newProps.children;
        }
      }

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
        child.destroy();
      }
    },

    clearContainer() {},

    removeChildFromContainer() {},

    detachDeletedInstance() {},

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

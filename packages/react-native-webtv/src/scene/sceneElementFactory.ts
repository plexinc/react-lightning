import {
  type ElementFactory,
  type LightningElement,
  LightningElementType,
} from '@plextv/react-lightning';

import { KIND_IMAGE, KIND_TEXT, KIND_VIEW, SceneElement } from './SceneElement';

/** react-lightning element factory for the webtv renderer: one SceneElement per React element. */
export const sceneElementFactory: ElementFactory = {
  createElement(type, props, renderer, plugins, fiber) {
    const kind =
      type === LightningElementType.Text
        ? KIND_TEXT
        : type === LightningElementType.Image
          ? KIND_IMAGE
          : KIND_VIEW;

    return new SceneElement(
      kind,
      props as ConstructorParameters<typeof SceneElement>[1],
      renderer as never,
      plugins,
      fiber,
    ) as unknown as LightningElement;
  },
  configure({ roundedClipping, flattenLayoutViews }) {
    SceneElement.roundedClippingEnabled = roundedClipping;
    SceneElement.flattenLayoutViewsEnabled = flattenLayoutViews;
  },
};

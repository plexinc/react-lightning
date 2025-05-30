declare global {
  interface Window {
    timeStart(
      condition?: boolean,
    ): (...args: Parameters<(typeof console)['log']>) => void;
  }
}

window.timeStart = (condition?: boolean) => {
  if (condition === false) {
    return () => {};
  }

  const start = performance.now();

  return (...args: Parameters<(typeof console)['log']>) => {
    const end = performance.now();
    const duration = end - start;
    console.log('>>', ...args, 'duration:', duration, 'ms');
  };
};

export {
  type RenderOptions,
  createRoot,
  type LightningRoot,
  LightningRootContext,
} from './render';
export type { Plugin } from './render/Plugin';

export { createLightningElement } from './element/createLightningElement';
export { LightningViewElement } from './element/LightningViewElement';
export { LightningImageElement } from './element/LightningImageElement';
export { LightningTextElement } from './element/LightningTextElement';
export { AllStyleProps } from './element/AllStyleProps';

export { Keys } from './input/Keys';
export { FocusGroupContext } from './focus/FocusGroupContext';
export { FocusGroup, type FocusGroupProps } from './focus/FocusGroup';
export { focusable } from './focus/focusable';
export { useFocus } from './focus/useFocus';
export { useCombinedRef } from './hooks/useCombinedRef';
export { simpleDiff } from './utils/simpleDiff';

export { Canvas } from './components/Canvas';

export * from './types';

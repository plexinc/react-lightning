import type { LightningElement, Plugin } from '@plex/react-lightning';
import { version as reactVersion } from 'react';
import { createRoot } from 'react-dom/client';
import { setNamespace } from 'webext-bridge/window';
import { ElementTracker } from './ElementTracker';
import { PluginView } from './PluginView';
import { monkeyPatchCanvas } from './monkeyPatchCanvas';

let initialized = false;

function inspectorPlugin(): Plugin<LightningElement> {
  if (!initialized) {
    setNamespace('com.plex.react-lightning-devtools');
    monkeyPatchCanvas();
    initialized = true;
  }

  const elementTracker = new ElementTracker();

  return {
    init(renderer, reconciler) {
      const root = document.createElement('div');

      document.body.appendChild(root);

      createRoot(root).render(
        <PluginView renderer={renderer} elementTracker={elementTracker} />,
      );

      reconciler.injectIntoDevTools({
        bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
        rendererPackageName: '@lightningjs/react-lightning',
        version: reactVersion,
      });

      return Promise.resolve();
    },
    onCreateInstance(instance, _initialProps, fiber) {
      elementTracker.create(instance as LightningElement, fiber);

      const disposers = [
        instance.on('childAdded', (child) => {
          elementTracker.addChild(instance.id, child.id);
        }),

        instance.on('childRemoved', (child) => {
          elementTracker.removeChild(child.id);
        }),

        instance.on('focusChildAdded', (child) => {
          elementTracker.makeFocusable(instance.id);
          elementTracker.makeFocusable(child.id);
        }),

        instance.on('focusChanged', (focused) => {
          elementTracker.makeFocused(instance.id, focused);
        }),

        instance.on('destroy', () => {
          elementTracker.removeChild(instance.id);
          for (const disposer of disposers) {
            disposer();
          }
        }),
      ];
    },
  };
}

export default inspectorPlugin;

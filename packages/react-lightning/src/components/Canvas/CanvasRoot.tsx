import { type FC, useContext, useEffect, useRef, useState } from 'react';

import { FocusGroup } from '../../focus/FocusGroup';
import { FocusKeyManager } from '../../focus/FocusKeyManager';
import { FocusManager } from '../../focus/FocusManager';
import { FocusManagerContext } from '../../focus/FocusManagerContext';
import { KeyMapContext } from '../../input/KeyMapContext';
import { KeyPressHandler } from '../../input/KeyPressHandler';
import { LightningRootContext } from '../../render';
import type { LightningElement } from '../../types';
import type { CanvasProps } from './CanvasProps';

type Props = Omit<CanvasProps, 'options'> & { width?: number; height?: number };

export const CanvasRoot: FC<Props> = ({ width, height, children, keyMap }) => {
  const ref = useRef<LightningElement>(null);
  const [focusManager] = useState(() => new FocusManager<LightningElement>());
  const [focusKeyManager] = useState(() => new FocusKeyManager(focusManager));
  const rootContext = useContext(LightningRootContext);

  useEffect(() => {
    if (!import.meta.env.DEV || !rootContext) {
      return;
    }

    let hook = window.__LIGHTNINGJS_DEVTOOLS_HOOK__;

    if (!hook) {
      hook = window.__LIGHTNINGJS_DEVTOOLS_HOOK__ = {};
    }

    hook.config = {
      renderer: rootContext.renderer,
      focusManager,
      features: ['react-lightning'],
    };

    if (hook?.inject) {
      hook.inject();
    }
  });

  return (
    <KeyMapContext.Provider value={keyMap}>
      <FocusManagerContext.Provider
        value={{
          focusManager,
          focusKeyManager,
        }}
      >
        <KeyPressHandler>
          <FocusGroup
            ref={ref}
            style={{
              w: width ?? 1920,
              h: height ?? 1080,
              clipping: true,
            }}
          >
            {children}
          </FocusGroup>
        </KeyPressHandler>
      </FocusManagerContext.Provider>
    </KeyMapContext.Provider>
  );
};

import { useRef } from 'react';
import { FocusGroup } from '../../focus/FocusGroup';
import { FocusKeyManager } from '../../focus/FocusKeyManager';
import { FocusManager } from '../../focus/FocusManager';
import { FocusManagerContext } from '../../focus/FocusManagerContext';
import { KeyEventProvider } from '../../input/KeyEventProvider';
import { KeyMapContext } from '../../input/KeyMapContext';
import { KeyPressHandler } from '../../input/KeyPressHandler';
import type { LightningElement } from '../../types';
import type { CanvasProps } from './CanvasProps';

export const CanvasRoot = ({
  children,
  keyMap,
  width,
  height,
}: CanvasProps) => {
  const ref = useRef<LightningElement>(null);
  const focusManager = useRef<FocusManager<LightningElement>>(
    new FocusManager(),
  );
  const focusKeyManager = useRef<FocusKeyManager<LightningElement>>(
    new FocusKeyManager(focusManager.current),
  );

  return (
    <KeyMapContext.Provider value={keyMap}>
      <FocusManagerContext.Provider
        value={{
          focusManager: focusManager.current,
          focusKeyManager: focusKeyManager.current,
        }}
      >
        <KeyEventProvider>
          <KeyPressHandler>
            <FocusGroup
              ref={ref}
              style={{
                width: width ?? 1920,
                height: height ?? 1080,
                clipping: true,
              }}
            >
              {children}
            </FocusGroup>
          </KeyPressHandler>
        </KeyEventProvider>
      </FocusManagerContext.Provider>
    </KeyMapContext.Provider>
  );
};

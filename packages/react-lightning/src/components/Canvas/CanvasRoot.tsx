import { useRef } from 'react';
import { FocusGroup } from '../../focus/FocusGroup';
import { FocusPathProvider } from '../../focus/FocusPathProvider';
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

  return (
    <KeyMapContext.Provider value={keyMap}>
      <FocusPathProvider rootRef={ref}>
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
      </FocusPathProvider>
    </KeyMapContext.Provider>
  );
};

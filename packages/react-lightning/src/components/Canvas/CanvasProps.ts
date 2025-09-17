import type { ReactNode } from 'react';
import type { KeyMap } from '../../input/KeyMapContext';
import type { RenderOptions } from '../../render';

export interface CanvasProps {
  children: ReactNode;
  keyMap: KeyMap;
  options: RenderOptions;
}

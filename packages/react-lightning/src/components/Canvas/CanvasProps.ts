import type { ReactNode } from 'react';
import type { KeyMap } from '../../input/KeyMapContext';
import type { RenderOptions } from '../../render';

export interface CanvasProps {
  width?: number;
  height?: number;
  children: ReactNode;
  keyMap: KeyMap;
  options?: RenderOptions;
}

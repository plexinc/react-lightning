import type { LightningElement } from '@plex/react-lightning';
import type { Fiber } from 'react-reconciler';

export type InspectableLightningElement = LightningElement & {
  __debugFiber?: Fiber;
};

export type PluginOptions = {
  /**
   * Shows the preview window for focused elements
   */
  showPreview: boolean;
};

export type SimpleElement = {
  id: number;
  name: string;
  focused: boolean;
  focusable: boolean;
  parent?: number;
  children: number[];
};

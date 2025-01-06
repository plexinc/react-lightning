import type { Keys } from '../input/Keys';
import type { LightningElement } from './Element';

export type KeyEvent = {
  key: string;
  code: string;
  keyCode: number;
  remoteKey: Keys | Keys[];
  target: LightningElement;
};

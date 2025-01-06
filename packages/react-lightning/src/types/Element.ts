import type { LightningImageElement } from '../element/LightningImageElement';
import type { LightningTextElement } from '../element/LightningTextElement';
import type { LightningViewElement } from '../element/LightningViewElement';

export type LightningElement =
  | LightningViewElement
  | LightningImageElement
  | LightningTextElement;

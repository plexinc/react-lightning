import type { LightningManager } from './LightningManager';

let _instance: LightningManager | undefined;

export function setFlexboxManager(manager: LightningManager): void {
  _instance = manager;
}

export function getFlexboxManager(): LightningManager | undefined {
  return _instance;
}

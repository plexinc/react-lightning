import type { LightningElement } from '../types';
import type { FocusByKeyOptions, FocusManager } from './FocusManager';

type Manager = FocusManager<LightningElement>;

const DEFAULT_TIMEOUT_MS = 2000;
const registered: Manager[] = [];
const listeners = new Set<() => void>();

export function registerFocusManager(focusManager: Manager): () => void {
  registered.push(focusManager);

  for (const listener of listeners) {
    listener();
  }

  return () => {
    const index = registered.lastIndexOf(focusManager);

    if (index !== -1) {
      registered.splice(index, 1);
    }
  };
}

export function getFocusManager(): Manager | null {
  return registered[registered.length - 1] ?? null;
}

export function containsFocus(key: string): boolean {
  return getFocusManager()?.containsFocus(key) ?? false;
}

export function refocusInitial(): void {
  getFocusManager()?.refocusInitial();
}

export function focusByKey(key: string, options?: FocusByKeyOptions): Promise<boolean> {
  const focusManager = getFocusManager();

  if (focusManager) {
    return focusManager.requestFocusByKey(key, options);
  }

  const signal = options?.signal;

  if (signal?.aborted) {
    return Promise.resolve(false);
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  return new Promise<boolean>((resolve) => {
    const cleanup = () => {
      clearTimeout(timer);
      listeners.delete(onRegister);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      resolve(false);
    };
    const onRegister = () => {
      const manager = getFocusManager();

      if (!manager) {
        return;
      }

      cleanup();
      resolve(
        manager.requestFocusByKey(key, {
          signal,
          timeoutMs: Math.max(0, deadline - Date.now()),
        }),
      );
    };
    const timer = setTimeout(onAbort, timeoutMs);

    listeners.add(onRegister);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

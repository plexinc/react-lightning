import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockElement } from '../mocks/createMockElement';
import type { LightningElement } from '../types';
import {
  containsFocus,
  focusByKey,
  getFocusManager,
  registerFocusManager,
} from './activeFocusManager';
import { FocusManager } from './FocusManager';

type Manager = FocusManager<LightningElement>;

const createManager = () => new FocusManager() as unknown as Manager;
const element = (id: number, name: string) =>
  createMockElement(id, name) as unknown as LightningElement;

describe('active focus manager', () => {
  const unregisters: (() => void)[] = [];
  const register = (manager: Manager) => {
    unregisters.push(registerFocusManager(manager));
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    unregisters.splice(0).forEach((unregister) => unregister());
    vi.useRealTimers();
  });

  it('returns the latest registered manager', () => {
    const a = createManager();
    const b = createManager();
    expect(getFocusManager()).toBeNull();

    register(a);
    const unregisterB = registerFocusManager(b);
    expect(getFocusManager()).toBe(b);

    unregisterB();
    expect(getFocusManager()).toBe(a);
  });

  it('answers containsFocus from the active manager', () => {
    expect(containsFocus('play')).toBe(false);

    const manager = createManager();
    const play = element(1, 'play');
    manager.addElement(play, null, { focusKey: 'play' });
    manager.focus(play);
    register(manager);

    expect(containsFocus('play')).toBe(true);
  });

  it('waits for a manager to register before focusing', async () => {
    const result = focusByKey('play');
    const manager = createManager();
    const play = element(1, 'play');
    manager.addElement(play, null, { focusKey: 'play' });
    register(manager);

    await expect(result).resolves.toBe(true);
    expect(play.focused).toBe(true);
  });

  it('times out when no manager ever registers', async () => {
    const result = focusByKey('play', { timeoutMs: 100 });
    vi.advanceTimersByTime(100);

    await expect(result).resolves.toBe(false);
  });

  it('shares one deadline between waiting for the manager and the key', async () => {
    const result = focusByKey('play', { timeoutMs: 100 });
    vi.advanceTimersByTime(60);
    const manager = createManager();
    register(manager);
    vi.advanceTimersByTime(40);

    await expect(result).resolves.toBe(false);
  });
});

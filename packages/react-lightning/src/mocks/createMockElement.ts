import type { Focusable } from '../types';
import type { EventNotifier } from '../types/EventNotifier';

export class MockElement implements Focusable, EventNotifier {
  private _focused = false;

  public constructor(
    public id = 0,
    public name = '',
    public visible = true,
  ) {}

  public on = (): (() => void) => {
    // Mock implementation, does nothing
    return () => {};
  };
  public off = (): void => {
    // Mock implementation, does nothing
  };
  public emit = (): void => {
    // Mock implementation, does nothing
  };

  public get focusable() {
    return this.visible;
  }
  public get focused() {
    return this._focused;
  }
  public focus() {
    this._focused = true;
  }
  public blur() {
    this._focused = false;
  }
}

export function createMockElement(id: number, name: string, visible = true) {
  return new MockElement(id, name, visible);
}

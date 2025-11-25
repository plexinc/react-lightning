import type { Focusable } from '../types';
import type { EventNotifier } from '../types/EventNotifier';

export class MockElement implements Focusable, EventNotifier {
  private _focusable = true;
  private _focused = false;

  public constructor(
    public id = 0,
    public name = '',
    public visible = true,
    public parent: MockElement | null = null,
    public children: MockElement[] = [],
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
    return this._focusable && this.visible;
  }
  public set focusable(value: boolean) {
    this._focusable = value;
  }

  public get focused(): boolean {
    return this._focused;
  }
  public focus(): void {
    this._focused = true;
  }
  public blur(): void {
    this._focused = false;
  }

  public toString() {
    return `MockElement(id=${this.id}, name=${this.name}, visible=${this.visible}, focusable=${this.focusable}, focused=${this.focused})`;
  }
}

export function createMockElement(
  id: number,
  name: string,
  visible = true,
): MockElement {
  return new MockElement(id, name, visible);
}

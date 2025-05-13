import type { Focusable } from '../types';
import { EventEmitter } from '../utils/EventEmitter';

export class MockElement
  extends EventEmitter<Record<string, () => unknown>>
  implements Focusable
{
  private _focused = false;

  public constructor(
    public id = 0,
    public name = '',
    public visible = true,
  ) {
    super();
  }

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

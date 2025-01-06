import {
  type LightningElement,
  LightningViewElement,
} from '@plex/react-lightning';
import { stringify } from 'flatted';
import type { Fiber } from 'react-reconciler';
import { sendMessage } from 'webext-bridge/window';
import type { SimpleElement } from '../types';
import getComponentNameFromFiber from '../vendor/getComponentNameFromFiber';
import { getSerializableProps } from './getSerializableProps';

const IGNORE_NAMES = ['View', 'Text', 'ForwardRef'];

/**
 * Tracks all the elements for rendering in devtools. We keep this around in
 * case devtools isn't currently open but opens later.
 */
export class ElementTracker<T extends LightningElement = LightningElement> {
  private _isConnected = false;
  private _elementMap: Record<number, SimpleElement> = {};
  private _watchedElementDisposers: (() => void)[] = [];

  public create(element: T, fiber: Fiber) {
    let name = getComponentNameFromFiber(fiber);
    let prevGoodName = name;
    let nextFiber = fiber.return;

    // Traverse up the tree to find the actual component name if we see View or Text
    while (
      name &&
      nextFiber &&
      (IGNORE_NAMES.includes(name) || name.endsWith('Provider'))
    ) {
      prevGoodName = name;
      name = getComponentNameFromFiber(nextFiber);
      nextFiber = nextFiber.return;
    }

    const simpleElement: SimpleElement = {
      id: element.id,
      name: name ?? prevGoodName ?? 'Unknown',
      focused: false,
      focusable: false,
      children: [],
    };
    this._elementMap[element.id] = simpleElement;

    this.sendCreateOrUpdate(simpleElement);
  }

  public addChild(parentId: number, childId: number) {
    const parent = this._elementMap[parentId];
    const child = this._elementMap[childId];

    if (parent && child) {
      child.parent = parentId;
      parent.children.push(childId);

      this.sendCreateOrUpdate(parent);
      this.sendCreateOrUpdate(child);
    }
  }

  public removeChild(parentId: number) {
    const parent = this._elementMap[parentId];

    if (parent) {
      delete this._elementMap[parentId];
      this.sendRemove(parent);
    }
  }

  public makeFocusable(id: number) {
    const element = this._elementMap[id];

    if (element) {
      element.focusable = true;
      this.sendCreateOrUpdate(element);
    }
  }

  public makeFocused(id: number, focused: boolean) {
    const element = this._elementMap[id];

    if (element) {
      element.focused = focused;
      this.sendCreateOrUpdate(element);
    }
  }

  public watchElement(id: number) {
    if (this._watchedElementDisposers) {
      for (const disposer of this._watchedElementDisposers) {
        disposer();
      }
    }

    const element = this._elementMap[id];
    const lngElement = LightningViewElement.allElements[id];

    if (!element || !lngElement) {
      return;
    }

    this._watchedElementDisposers = [
      lngElement.on('layout', () => this.sendProps(element, lngElement)),
      lngElement.on('flexLayout', () => this.sendProps(element, lngElement)),
      lngElement.on('stylesChanged', () => this.sendProps(element, lngElement)),
    ];

    this.sendProps(element, lngElement);
  }

  public connect() {
    this._isConnected = true;
    this.fullSend();
  }

  public disconnect() {
    this._isConnected = false;
  }

  public sendProps(element: SimpleElement, lngElement: LightningElement) {
    if (!this._isConnected) {
      return;
    }

    console.debug('Sending to devtools (props):', lngElement);
    sendMessage(
      'elementProps',
      stringify(getSerializableProps(element, lngElement)),
      'devtools',
    );
  }

  public sendCreateOrUpdate(element: SimpleElement) {
    if (!this._isConnected) {
      return;
    }

    console.debug('Sending to devtools (elementUpdated):', element);
    sendMessage('elementUpdated', element, 'devtools');
  }

  public sendRemove(element: SimpleElement) {
    if (!this._isConnected) {
      return;
    }

    console.debug('Sending to devtools (elementRemoved):', element);
    sendMessage('elementRemoved', element.id, 'devtools');
  }

  public fullSend() {
    if (!this._isConnected) {
      return;
    }

    console.debug('Sending to devtools (replaceElements):', this._elementMap);
    sendMessage('replaceElements', this._elementMap, 'devtools');
  }
}

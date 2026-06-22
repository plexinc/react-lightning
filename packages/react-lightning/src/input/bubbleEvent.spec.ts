import { describe, expect, it, vi } from 'vitest';

import type { KeyEvent, LightningElement } from '../types';
import { bubbleEvent } from './bubbleEvent';
import { Keys } from './Keys';

type Handlers = Partial<
  Record<
    'onKeyDown' | 'onKeyUp' | 'onKeyPress' | 'onLongPress',
    (event: KeyEvent) => boolean | undefined
  >
>;

function makeElement(props: Handlers, parent: LightningElement | null = null): LightningElement {
  return { props, parent } as unknown as LightningElement;
}

function keyEvent(target: LightningElement): KeyEvent {
  return {
    key: 'ArrowRight',
    code: 'ArrowRight',
    keyCode: 39,
    remoteKey: Keys.Right,
    repeat: false,
    target,
    currentTarget: target,
    stopFocusHandling: false,
    preventDefault: vi.fn(),
  };
}

describe('bubbleEvent', () => {
  it('bubbles from target up through the parent chain', () => {
    const order: string[] = [];
    const root = makeElement({ onKeyDown: () => void order.push('root') });
    const mid = makeElement({ onKeyDown: () => void order.push('mid') }, root);
    const leaf = makeElement({ onKeyDown: () => void order.push('leaf') }, mid);

    bubbleEvent('onKeyDown', keyEvent(leaf));

    expect(order).toEqual(['leaf', 'mid', 'root']);
  });

  it('stops bubbling when a handler returns false', () => {
    const rootHandler = vi.fn();
    const root = makeElement({ onKeyDown: rootHandler });
    const leaf = makeElement({ onKeyDown: () => false }, root);

    bubbleEvent('onKeyDown', keyEvent(leaf));

    expect(rootHandler).not.toHaveBeenCalled();
  });

  it('updates currentTarget to the element handling the event', () => {
    const seen: Array<LightningElement | undefined> = [];
    const root = makeElement({
      onKeyDown: (e) => void seen.push(e.currentTarget),
    });
    const leaf = makeElement({ onKeyDown: (e) => void seen.push(e.currentTarget) }, root);

    bubbleEvent('onKeyDown', keyEvent(leaf));

    expect(seen).toEqual([leaf, root]);
  });

  it('skips elements without a matching handler and keeps bubbling', () => {
    const rootHandler = vi.fn();
    const root = makeElement({ onKeyDown: rootHandler });
    const mid = makeElement({}, root);
    const leaf = makeElement({}, mid);

    bubbleEvent('onKeyDown', keyEvent(leaf));

    expect(rootHandler).toHaveBeenCalledTimes(1);
  });
});

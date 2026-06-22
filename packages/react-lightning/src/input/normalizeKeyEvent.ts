import type { LightningElement } from '../types';
import type { KeyEvent } from '../types/KeyEvent';
import type { KeyMap } from './KeyMapContext';
import { Keys } from './Keys';

/**
 * The slice of a DOM {@link KeyboardEvent} the key pipeline needs. Accepting a
 * structural subset (rather than `KeyboardEvent`) lets synthesized remote events
 * flow through the exact same normalization as real keyboard input.
 */
export type RawKeyEvent = Pick<KeyboardEvent, 'key' | 'code' | 'keyCode' | 'repeat'> & {
  preventDefault: () => void;
};

/**
 * Builds a normalized {@link KeyEvent} from a raw DOM key event.
 *
 * Centralizes the three things the framework was previously doing
 * inconsistently (or wrong) at the call site:
 *
 * - **keyCode → remoteKey** via the active {@link KeyMap}, falling back to
 *   {@link Keys.Unknown} so every event carries a defined `remoteKey`.
 * - **held-key `repeat`** is preserved verbatim so downstream handlers can tell
 *   an OS auto-repeat from a fresh press (the basis for long-press / held-key
 *   navigation) instead of the repeats being dropped on the floor.
 * - **a bound `preventDefault`** — the DOM method must run with its event as
 *   `this`, so copying the reference (`preventDefault: domEvent.preventDefault`)
 *   throws "Illegal invocation" the moment a handler calls it. Wrapping it in a
 *   closure keeps the normalized event self-contained and safe to invoke.
 */
export function normalizeKeyEvent(
  domEvent: RawKeyEvent,
  keyMap: KeyMap,
  element: LightningElement,
): KeyEvent {
  return {
    key: domEvent.key,
    code: domEvent.code,
    keyCode: domEvent.keyCode,
    remoteKey: keyMap[domEvent.keyCode] ?? Keys.Unknown,
    repeat: domEvent.repeat,
    target: element,
    currentTarget: element,
    stopFocusHandling: false,
    preventDefault: () => domEvent.preventDefault(),
  };
}

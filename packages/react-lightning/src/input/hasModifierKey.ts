/** The modifier flags of a {@link KeyboardEvent} the key pipeline cares about. */
export type ModifierKeyEvent = Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'altKey'>;

/**
 * True when a Cmd/Ctrl/Alt modifier is held. A TV remote never sends modifiers,
 * so these events are host shortcuts (devtools, select-all, Storybook keys) that
 * the framework should let through rather than swallow. Shift is deliberately
 * ignored: it doesn't form a host shortcut here and the keycode map is
 * shift-independent.
 */
export function hasModifierKey(event: ModifierKeyEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey;
}

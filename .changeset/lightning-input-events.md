---
"@plextv/react-lightning": patch
---

fix(input): normalize key events and stop swallowing held-key auto-repeat

The key pipeline no longer drops OS auto-repeat events. Holding a directional key now keeps bubbling `onKeyDown` events (with `repeat: true`) through the focus tree, so held keys keep navigating and handlers can implement held-key/long-press behavior without re-deriving repeats from raw DOM listeners. The long-press duration is now measured from the initial press (the press timestamp is no longer reset by each repeat), so a held key still resolves to `onLongPress` on release.

Key events are also normalized into a consistent shape via a new `normalizeKeyEvent` helper: `keyCode` maps to `remoteKey` (falling back to `Keys.Unknown`), `repeat` is preserved, and `preventDefault` is now bound — previously the raw DOM method was copied unbound, so calling `event.preventDefault()` from a handler threw "Illegal invocation". `currentTarget` is now part of the `KeyEvent` type rather than bolted on during bubbling.

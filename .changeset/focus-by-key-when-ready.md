---
'@plextv/react-lightning': patch
---

add `getFocusManager()`, `containsFocus(key)`, `refocusInitial()` and a `focusByKey(key)` that waits (bounded, cancellable) for a key that hasn't mounted yet, and keep a pending `focus()` request across a layer change when its target isn't in the layer being left.

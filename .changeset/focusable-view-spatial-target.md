---
'@plextv/react-native-lightning': patch
---

A `View` with `focusable` set is registered as a Lightning spatial-focus target. Native treats any focusable View as a nav target, but react-lightning only knew about `useFocus`/`FocusGroup` elements, so a plain focusable View was unreachable by directional nav and never fired `onFocus`. Only opt-in focusable Views pay for the registration; every other View still renders as a bare node.

Adds `focusRestorationExcluded` for a directional-only catcher: reachable by a deliberate move, but never by restoration or the mount-time default.

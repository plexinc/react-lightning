---
'@plextv/react-lightning': patch
---

A FocusGroup with no focusable descendant is now skipped by spatial navigation and autoFocus instead of acting as a focus stop. Groups only delegate focus to their children, so a group wrapping non-interactive content (e.g. a list section header) shouldn't be a target; real leaves (Pressable, a `focusable` View) are unaffected. Effective focusability tracks `hasFocusableChildren` and propagates up the ancestor chain, so a group flips back the moment a focusable child mounts (or its last one is removed).

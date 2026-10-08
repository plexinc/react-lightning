---
'@plextv/react-lightning': minor
---

The focus engine implements the native focus semantics itself: `focusEntry` (`first`, `last-focused`, `spatial`), `rememberAs`, scopes with `initialFocus` claims (`refocusInitial()`), nearest-by-geometry repick when the focused element is removed, and `onFocusEnter` / `onFocusLeave` per group. Groups that use none of them behave as before.

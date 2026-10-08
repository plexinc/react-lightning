---
'@plextv/react-lightning': patch
---

`useFocus` registers once with a single options object and applies later changes in one effect that compares them, instead of an effect per option. `FocusGroup` passes `focusEntry`, `rememberAs`, `scope`, `active`, `initialFocus`, `onFocusEnter` and `onFocusLeave` straight to it, and its traps no longer re-apply on every render. The focus key manager no longer allocates per directional key.

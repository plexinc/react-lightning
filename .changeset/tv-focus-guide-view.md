---
'@plextv/react-native-lightning': patch
---

export `TVFocusGuideView` with react-native-tvos props on top of `FocusGroup`, and resolve the active focus manager for `requestTVFocus()` and `setDestinations()` without walking the fiber tree.

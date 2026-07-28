---
'@plextv/react-native-lightning': patch
---

fix(react-native-lightning): implement `ScrollView.getNativeScrollRef()`

Shared RN code that scrolls a selected child into view calls
`scrollRef.current.getNativeScrollRef()` and measures the child against the
returned node (`child.measureLayout(scrollHostNode, ...)`), expecting a
content-relative offset independent of the current scroll position. The Lightning
`ScrollView` never implemented `getNativeScrollRef`, so the call threw
`getNativeScrollRef is not a function`. It now returns the inner scrolled content
container (the node that carries the scroll offset as its own x/y), so
`measureLayout` against it yields the same content-relative coordinates as native
React Native.

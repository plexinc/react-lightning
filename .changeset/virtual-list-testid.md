---
'@plextv/react-lightning': patch
'@plextv/react-lightning-components': patch
---

`VirtualList` forwards `testID` to its outer container. Its props were a closed interface with no `testID`, so the prop was dropped and never reached an element, which left any screen whose root is a `VirtualList` invisible to test tooling that matches on it. `testID` is also declared on `LightningViewElementProps` now, since the react-native compat layer already passed it through untyped and the element treats it as inert.

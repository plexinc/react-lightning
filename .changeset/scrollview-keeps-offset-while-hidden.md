---
'@plextv/react-native-lightning': patch
---

scrollview keeps its offset while hidden or unmeasured instead of resetting to 0, and clamps it to the scrollable range once it has a size.

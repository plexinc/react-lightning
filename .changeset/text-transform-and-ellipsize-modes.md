---
'@plextv/react-native-lightning': patch
---

`Text` applies `textTransform` from its style, and `ellipsizeMode` `head`/`middle` map to a text overflow instead of being dropped — only `clip` and `tail` were handled before.

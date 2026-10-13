---
'@plextv/react-native-lightning': patch
---

hidden scroll views skip the per-key focus scroll check, so frozen screens kept mounted cost almost nothing on focus changes.

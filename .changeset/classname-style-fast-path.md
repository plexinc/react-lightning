---
'@plextv/react-lightning': patch
'@plextv/react-native-lightning': patch
---

add an optional `needsTransform` plugin hook so a plugin can let style-only updates take the fast path per instance, and use it in the className plugin: style-only updates on elements without resolved class styles no longer go through the full transform pipeline

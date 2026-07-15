---
'@plextv/react-native-lightning': patch
'@plextv/react-lightning-plugin-flexbox': patch
---

Keep className-derived styles on style-only updates. Update payloads omit an unchanged className, so its resolved styles vanished from the style object and the flexbox plugin reset those props (a column screen re-laid out as a row after toggling display). The className plugin now remembers what it resolved per instance. Also: a dropped flexDirection resets to column (the node creation default, not the CSS row default), and addChildNode without an index appends at the parent's child count instead of index 0.

---
'@plextv/react-lightning': patch
---

Every ancestor focus group is notified when its own directly-focused child changes, not only the group directly above the leaf. A VirtualList whose cells nest their own focus group never learned that focus had crossed a cell, so its scroll-to-focus stopped following. Matches tvOS, where every ancestor hears about focus crossing its children.

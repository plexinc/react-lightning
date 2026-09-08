---
'@plextv/react-lightning': patch
---

`setFocusedChild` queues a preferred-child request whose target is not registered or focusable yet, instead of dropping it. A React child effect runs before its element is attached to the focus tree, so a group's remembered child could not be set up front. Mirrors `focus()`, which already queues for the same reason.

---
'@plextv/react-lightning': patch
---

A withheld node no longer reveals at its untransformed origin when a pixel translate takes more than one layout pass to fold into the position. The reveal was bounded to a single extra layout, so anything deeper in the async flex tree painted at its base position for a frame — a drawer laid out on screen and translated off would flash open at mount. The reveal now waits for the translate to actually settle, bounded so a translate that can't be detected still can't strand the node invisible.

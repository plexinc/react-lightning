---
'@plextv/react-lightning': patch
---

when a screen that took focus from a hidden (covered) sibling goes away, focus returns to that sibling once it shows again instead of landing on whatever became focusable first.

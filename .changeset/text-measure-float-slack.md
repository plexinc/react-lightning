---
'@plextv/react-lightning-plugin-flexbox': patch
---

Allow 0.01px of slack on the width limit when measuring text. Yoga hands the width back as a float32, which can land a hair under the text's own width and split a short word across lines ("TV-14" as "TV-1" / "4").

---
'@plextv/react-lightning': patch
---

Directional moves pick the next sibling by beaming from the focused leaf instead of the group's focused child, as on tvOS and Android. Up from a tile at the left of a full-width row now goes to what sits above that tile, not to whatever sits above the row's centre. When nothing lines up with the leaf, the row is used as before.

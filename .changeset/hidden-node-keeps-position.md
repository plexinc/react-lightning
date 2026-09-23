---
"@plextv/react-lightning-plugin-flexbox": patch
---

A `display: 'none'` node keeps the position it was laid out at instead of being moved to the origin. Yoga zeroes the computed box of a hidden node, and emitting that dragged the node — and its subtree — to 0,0, so an element parked off screen by a translate read as on screen to anything walking the scene graph.

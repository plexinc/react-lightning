---
'@plextv/react-lightning': patch
---

`focusRestorationExcluded` nodes are skipped by focus restoration. They never become the parent's mount-time default and never inherit focus when the focused sibling unmounts, so a drawer edge guard can't take focus during launch.

Separately, a node withheld until layout now waits one extra layout pass while a pixel translate hasn't been folded into its position yet — otherwise it painted at its untransformed origin for a frame. Bounded to that single extra pass, so a mis-detected translate can't strand the node invisible.

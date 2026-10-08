---
'@plextv/react-lightning': patch
---

A group's `rememberAs` now swaps the whole remembered chain, not only its direct child: a value that was never visited enters at its first item, and a value that comes back returns to the item it remembered by focus key, which still names the right item after a recycling list reused its cells. `refocusInitial` also holds back the repick of the focused item while its target is still mounting, so focus doesn't land on a surviving neighbour on the way (bounded to one second).

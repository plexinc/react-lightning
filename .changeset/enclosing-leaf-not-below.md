---
'@plextv/react-lightning': patch
---

Down no longer lands on a focusable leaf that fully encloses the focused element vertically (a full-height edge catcher beside the content), since it has nothing below the source. A group that encloses the source is still entered, as before. Also guards a NaN in the alignment score so focus can move away from a zero-size element. Matches Android's FocusFinder and tvOS.

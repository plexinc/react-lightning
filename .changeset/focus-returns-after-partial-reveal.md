---
'@plextv/react-lightning': patch
---

Focus returns to the group it was on when a covered screen shows again. Its content comes back piece by piece, so the group read as empty for a moment and focus was repicked onto a sibling (the Live TV guide landed on its category list instead of the airing). The repick is now a stand-in: the group is remembered and takes focus back once it has focusable content again, unless focus moved in the meantime.

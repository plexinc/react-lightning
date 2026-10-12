---
'@plextv/react-lightning': patch
---

Fire onLongPress once a key has been held for 500ms, while it is still down, instead of on keyup. The keyup after a long press no longer sends onKeyPress or onLongPress. Auto-repeat keydowns don't restart the timing.

---
'@plextv/react-lightning': patch
---

Skip focus destinations that are unfocusable or no longer registered instead of aborting the whole focus move. A destination can hold a stale ref (a recycled list cell that unmounted after setDestinations); the redirect now falls through to the next destination or to normal child focus, matching native TVFocusGuideView, which drops invalid node handles.

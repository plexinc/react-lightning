---
'@plextv/react-lightning-plugin-flexbox': patch
'@plextv/react-lightning': patch
---

A `transform` is a complete snapshot of the node's transform, so an axis it omits has returned to identity. Yoga now writes translate 0 for that axis instead of leaving the previous pixel inset in place, which a partial style push would otherwise never repaint (a cleared focus offset stayed where it was).

A focus group with `destinations` also forwards focus on every arrival, not just the first. `destinations` takes precedence over the remembered child, matching native `TVFocusGuideView`, so a reopened nav drawer returns to its selected item. `autoFocus` remains the separate first-then-remember mechanism.

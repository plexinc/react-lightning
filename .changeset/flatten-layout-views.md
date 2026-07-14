---
'@plextv/react-lightning': patch
---

Add a `flattenLayoutViews` render option: layout-only Views (no background, border, clip, non-neutral alpha/transform, or transition) skip renderer node creation entirely. The element keeps a lightweight placeholder, descendants attach to the nearest materialized ancestor, and layout positions accumulate across the flattened chain (folded at the layout write funnels, unwound in `getRelativePosition`/`onLayout`). A flattened element materializes a real node on the first prop that needs one (sticky, so per-focus style toggles don't churn nodes). Inert RN-layer props (handlers, testID) don't prevent flattening; visual props at neutral values (color 0, alpha 1, scale 1) don't either. Off by default.

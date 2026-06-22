---
"@plextv/react-lightning-plugin-flexbox": patch
---

fix(flexbox): parse string `aspectRatio` values so ratio-sized nodes get a box

React Native accepts `aspectRatio` as a number (`1.5`), a ratio string (`'3/2'`), or a numeric string (`'1.5'`), but the value was passed straight to Yoga's `setAspectRatio`, which only takes a number. String forms became `NaN` and the ratio was silently dropped — so a node sized only by `aspectRatio` plus one dimension (e.g. an image with `aspectRatio: '3/2'` and `height: '65%'` but no width) resolved to zero width and never painted. String ratios are now parsed to a number before being applied.

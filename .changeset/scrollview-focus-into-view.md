---
'@plextv/react-native-lightning': patch
'@plextv/react-lightning': patch
---

`ScrollView` reveals a focused descendant the way native TV scroll views do: scroll the minimum needed to bring it fully into view, and leave already-visible items where they are. `snapToAlignment` only counts as deliberate placement for `center` and `end` — `start` and `item` (paging) aren't real focus targets, and `item` has no alignment math behind it at all, so both fall through to ensure-visible rather than snapping a focused row out of view. Exports `FocusManagerContext` from react-lightning so the compat layer can observe focus changes.

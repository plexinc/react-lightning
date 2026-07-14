---
'@plextv/react-lightning': patch
---

Two text-element fixes. A colorless Text mounted transparent: the mount-time color 0 stamp (meant for views, where the renderer default is white) ran before the text element's white default, so any Text without an explicit style color was invisible. Text elements are now excluded from the stamp. And a text fragment nested more than one level deep (Text > Text > string) only re-folded its direct parent on update; the text setter now propagates the re-fold through every aggregating ancestor.

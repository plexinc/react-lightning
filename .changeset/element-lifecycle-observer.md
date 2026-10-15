---
'@plextv/react-lightning': patch
'@plextv/react-lightning-plugin-flexbox': patch
---

let plugins observe element lifecycle through one shared observer, and track flexbox elements with it instead of nine listeners per element

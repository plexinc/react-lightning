---
'@plextv/react-lightning-plugin-css-transform': patch
---

Drop unresolvable CSS keyword colors (`inherit`, `currentColor`, `initial`, `unset`, `revert`) instead of throwing. They have no fixed value to resolve, so they reached the invalid-hex throw and took the whole screen down via the error boundary. Now the property is omitted. Also keep zero-valued transform values (`if (value != null)`), which the previous truthy check dropped.

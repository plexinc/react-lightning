---
'@plextv/react-lightning': patch
'@plextv/react-lightning-components': patch
---

Bubble focus/blur events up the element tree. tvOS and web deliver focus events to ancestor views (a wrapper View's onFocus fires when a focused descendant changes), but the focus path only reaches registered focus nodes, so handlers on plain wrappers never fired. FocusManager now walks the focused leaf's element ancestry on every leaf change and delivers the event to elements that didn't just fire their own focus()/blur(). VirtualList forwards onFocus/onBlur to its outer element so handlers spread onto a list participate like they do on a native FlashList host view.

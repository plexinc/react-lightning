---
'@plextv/react-lightning': patch
---

fix(react-lightning): keep the rounded/border shader on partial style updates

A partial style update (reanimated pushing just opacity/transform straight to
setProps) recomputed the node's shader from that partial style, found no
borderRadius/border, and cleared the Rounded shader. Any animated rounded node
squared off the moment reanimated touched it. Only rebuild or clear the shader
when the update actually carries a shader-relevant prop (or an explicit shader
override); otherwise keep the existing one.

---
'@plextv/react-lightning': patch
---

Add an opt-in `roundedClipping` render option: a node with borderRadius + clipping (overflow hidden) renders its subtree to a texture so the Rounded shader clips children to the rounded rect, like the other RN platforms. The composite is kept untinted and the node's background is painted inside the texture via a managed child. Off by default: each such container costs a GPU framebuffer, and renderer RTT invalidation still has rough edges with late-mounting content.

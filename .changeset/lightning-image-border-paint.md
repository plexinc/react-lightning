---
"@plextv/react-lightning": patch
"@plextv/react-native-lightning": patch
---

fix(image+border): flatten array styles on Image and paint/clear border shaders on live nodes

The RN `Image` component built its node style with an object spread (`{ ...style, w, h }`), so an RN style array (`style={[a, b]}`) became numeric-keyed garbage and its `width`/`height`/`borderRadius` were silently dropped (the array-flatten polyfill only ran when the style reached `setProps` still an array). `Image` now flattens with `flattenStyles` before spreading.

Border shaders can now be toggled on an already-mounted node. `border` and `borderColor` were missing from the set of style props that force the shader-creating slow path, so toggling a plain border (e.g. a focus ring) fast-pathed straight onto the node and never created a `Border` shader. A node that already carries a shader now always takes the slow path, and removing the border clears the shader (resetting the node to the stage default) instead of leaving it painting.

Updating an existing shader's props in place now keys off whether the prop exists, not whether its current value is truthy. Previously a prop whose current value was falsy (e.g. a transparent `border-color` of `0`) was skipped, so toggling a focus-ring border from transparent to a visible color on a mounted node was silently dropped and the ring never appeared.

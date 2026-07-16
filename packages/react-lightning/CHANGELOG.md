# @plextv/react-lightning

## 0.4.3-alpha.1

### Patch Changes

- edaeae2: React-hidden trees (Activity mode="hidden", suspended Suspense content) now set display: none instead of only alpha: 0, so they release their layout space like react-dom. The hide is sticky across later style pushes (a full style update used to reset display and pop the space back in while invisible), and unhide restores display and opacity from the current props.
- 895f6a9: Skip focus destinations that are unfocusable or no longer registered instead of aborting the whole focus move. A destination can hold a stale ref (a recycled list cell that unmounted after setDestinations); the redirect now falls through to the next destination or to normal child focus, matching native TVFocusGuideView, which drops invalid node handles.
- badb2f6: Bubble focus/blur events up the element tree. tvOS and web deliver focus events to ancestor views (a wrapper View's onFocus fires when a focused descendant changes), but the focus path only reaches registered focus nodes, so handlers on plain wrappers never fired. FocusManager now walks the focused leaf's element ancestry on every leaf change and delivers the event to elements that didn't just fire their own focus()/blur(). VirtualList forwards onFocus/onBlur to its outer element so handlers spread onto a list participate like they do on a native FlashList host view.
- 692445d: Two text-element fixes. A colorless Text mounted transparent: the mount-time color 0 stamp (meant for views, where the renderer default is white) ran before the text element's white default, so any Text without an explicit style color was invisible. Text elements are now excluded from the stamp. And a text fragment nested more than one level deep (Text > Text > string) only re-folded its direct parent on update; the text setter now propagates the re-fold through every aggregating ancestor.
- 0f901bd: Contain zIndex to its RN parent under view flattening. A flattened wrapper hoisted zIndex-carrying children to the nearest real ancestor, letting the index compete against unrelated subtrees (a nav bar's zIndex: 2 outranked modal screens mounted after it). A non-zero zIndex/zIndexLocked now materializes the flattened parent so the index only sorts among its real RN siblings, on attach and on every zIndex write path (setNodeProp, batched props, fast-path styles).

## 0.4.3-alpha.0

### Patch Changes

- e2a5e11: Fix flattened elements leaking when they run a reanimated exit animation. A layout-only view flattens to a placeholder node, and a placeholder's `animate()` is a no-op that never emits `stopped`. Reanimated defers node removal until the exit animation finishes, so on a flattened wrapper the finish never fired, the deferred destroy never ran, and the subtree (and its real image descendants) stayed on the scene forever, stacking on every remount. Materialize the element when a deferred-removal handler is attached so the exit animation runs on a real node and completes.
- 5237e31: Add a `flattenLayoutViews` render option: layout-only Views (no background, border, clip, non-neutral alpha/transform, or transition) skip renderer node creation entirely. The element keeps a lightweight placeholder, descendants attach to the nearest materialized ancestor, and layout positions accumulate across the flattened chain (folded at the layout write funnels, unwound in `getRelativePosition`/`onLayout`). A flattened element materializes a real node on the first prop that needs one (sticky, so per-focus style toggles don't churn nodes). Inert RN-layer props (handlers, testID) don't prevent flattening; visual props at neutral values (color 0, alpha 1, scale 1) don't either. Off by default.
- 8d0b8e8: Fix flattened content not scrolling: a scroll handler (or any code) that writes a flattened element's position straight through `node.x`/`node.y`, bypassing `setProps`, now folds through to the hoisted children. The placeholder's `x`/`y` are accessors that notify the owning element, which re-pushes the offset to descendants. Without this, a direct write landed on the inert placeholder and the content only jumped to its final position on the next React commit (no animation).
- 3a9a0c7: A FocusGroup with no focusable descendant is now skipped by spatial navigation and autoFocus instead of acting as a focus stop. Groups only delegate focus to their children, so a group wrapping non-interactive content (e.g. a list section header) shouldn't be a target; real leaves (Pressable, a `focusable` View) are unaffected. Effective focusability tracks `hasFocusableChildren` and propagates up the ancestor chain, so a group flips back the moment a focusable child mounts (or its last one is removed).
- 01a42e4: fix(react-lightning): clear a removed border's shader on full restyles

  The keep-shader guard (added so reanimated's partial pushes don't square off a rounded node) inferred "partial" from "no shader-relevant prop present". A full restyle that dropped a border matched that too, so a removed focus-ring border kept painting. It now gates on the PARTIAL_STYLE marker: a reconciler snapshot recomputes (and clears) the shader, while reanimated and imperative single-key style sets keep it. Imperative `el.style.x =` pushes are marked PARTIAL_STYLE too.

- 7005125: fix(flexbox): withhold paint until first layout to avoid the async-flex origin flash

  Flex layout is computed asynchronously (in a worker), so a definite-sized node mounts and paints at its pre-layout origin (0,0) for a frame or two before the layout result moves it. A node now keeps its rendered alpha at 0 from mount until its first layout resolves, then restores the styled alpha (`withholdPaintUntilLayout` / `releaseWithheldPaint`). Zero-sized and already-invisible nodes are skipped, and subtrees detached from flex layout are released so they can never be stranded invisible.

- 66c2c93: feat(focus): focus-when-ready, arrival-not-mount autoFocus, and destinations-on-arrival

  `FocusManager.focus()` no longer drops a request for an element that isn't registered or focusable yet — it queues it and resolves the moment the element becomes ready, so callers don't have to poll across frames. A later-mounting `autoFocus` child no longer steals live focus on registration (a new `focusCommitted` flag gates the upgrade), matching native `TVFocusGuideView`, which forwards focus on arrival rather than on mount. And `destinations` are now honoured on arrival (first visit without `focusRedirect`, every visit with it), so focus forwards to a declared destination then remembers the last-focused child.

- 9beb550: fix(image+border): flatten array styles on Image and paint/clear border shaders on live nodes

  The RN `Image` component built its node style with an object spread (`{ ...style, w, h }`), so an RN style array (`style={[a, b]}`) became numeric-keyed garbage and its `width`/`height`/`borderRadius` were silently dropped (the array-flatten polyfill only ran when the style reached `setProps` still an array). `Image` now flattens with `flattenStyles` before spreading.

  Border shaders can now be toggled on an already-mounted node. `border` and `borderColor` were missing from the set of style props that force the shader-creating slow path, so toggling a plain border (e.g. a focus ring) fast-pathed straight onto the node and never created a `Border` shader. A node that already carries a shader now always takes the slow path, and removing the border clears the shader (resetting the node to the stage default) instead of leaving it painting.

  Updating an existing shader's props in place now keys off whether the prop exists, not whether its current value is truthy. Previously a prop whose current value was falsy (e.g. a transparent `border-color` of `0`) was skipped, so toggling a focus-ring border from transparent to a visible color on a mounted node was silently dropped and the ring never appeared.

- 6e50057: fix(input): normalize key events and stop swallowing held-key auto-repeat

  The key pipeline no longer drops OS auto-repeat events. Holding a directional key now keeps bubbling `onKeyDown` events (with `repeat: true`) through the focus tree, so held keys keep navigating and handlers can implement held-key/long-press behavior without re-deriving repeats from raw DOM listeners. The long-press duration is now measured from the initial press (the press timestamp is no longer reset by each repeat), so a held key still resolves to `onLongPress` on release.

  Key events are also normalized into a consistent shape via a new `normalizeKeyEvent` helper: `keyCode` maps to `remoteKey` (falling back to `Keys.Unknown`), `repeat` is preserved, and `preventDefault` is now bound — previously the raw DOM method was copied unbound, so calling `event.preventDefault()` from a handler threw "Illegal invocation". `currentTarget` is now part of the `KeyEvent` type rather than bolted on during bubbling.

- b2492c6: Handle same-parent insertChild as a move so reordered children re-layout in the new order
- 3f4ed43: fix(react-lightning): keep the rounded/border shader on partial style updates

  A partial style update (reanimated pushing just opacity/transform straight to
  setProps) recomputed the node's shader from that partial style, found no
  borderRadius/border, and cleared the Rounded shader. Any animated rounded node
  squared off the moment reanimated touched it. Only rebuild or clear the shader
  when the update actually carries a shader-relevant prop (or an explicit shader
  override); otherwise keep the existing one.

- 660ae8d: feat(flexbox): measure text synchronously in Yoga for wrapping and intrinsic sizing

  Text leaves are now measured during Yoga layout (via msdf font metrics passed through the new `fonts` option) instead of relying solely on the renderer's async texture measurement, so text wraps and sizes correctly within flex layouts. The text node's explicit width/height is cleared when it becomes a measured leaf so the measure function — not a stale renderer-set width — drives its size, and `react-lightning` emits a `textChanged` signal so recycled/updated text re-measures.

- f6bee05: Add an opt-in `roundedClipping` render option: a node with borderRadius + clipping (overflow hidden) clips its children to the rounded rect, like the other RN platforms. Implemented via the renderer's stencil clip (`clipRadius`), so it costs no extra textures, nests, and works for text and images.
- 43594e7: fix(text): support FormattedMessage

## 0.4.2

### Patch Changes

- 247d2e8: chore: Remove .cjs from packages

## 0.4.1

### Patch Changes

- 38f1b60: chore: Update dependencies and migrate from Biome to oxc
- 38f1b60: feat: Add NodeResizeObserver, FocusManager.setFocusedChild, the `resized` element event, and a CanvasProps type export.

## 0.4.0

### Patch Changes

- 01d5f33: fix(focus): Fix traps not working properly in some cases
- f9a9cab: fix: support preventDefault() api for events
- 264488a: fix(focus): Allow key propagation even when focus handling was cancelled
- 848a0c1: fix: Layout event sometimes does not get fired
- 589da1b: fix(focus): Fix removing elements not applying across focus layers
- 8d1ac42: chore: Update lightning versions
- 1c9a5ac: feat(react-lightning): Add inViewport event from Lightning
- 848a0c1: chore: Dependency version bumps
- b5e7254: chore: Update lightning packages
- 8d1ac42: fix(focus): Fix case where FocusGroups sometimes get added to the wrong layer
- f9a9cab: fix: onChildFocused event now works on FocusGroups and useFocus
- 451dddd: chore: More build and package fixes
- a7a4885: fix: Fix builds and enable isolated declarations
- dbaa0ed: fix(focus): Fix focusability of items not getting reset when element parent changes

## 0.4.0-alpha.9

### Patch Changes

- 264488a: fix(focus): Allow key propagation even when focus handling was cancelled

## 0.4.0-alpha.8

### Patch Changes

- dbaa0ed: fix(focus): Fix focusability of items not getting reset when element parent changes

## 0.4.0-alpha.7

### Patch Changes

- f9a9cab: fix: support preventDefault() api for events
- f9a9cab: fix: onChildFocused event now works on FocusGroups and useFocus

## 0.4.0-alpha.6

### Patch Changes

- 589da1b: fix(focus): Fix removing elements not applying across focus layers

## 0.4.0-alpha.5

### Patch Changes

- 01d5f33: fix(focus): Fix traps not working properly in some cases

## 0.4.0-alpha.4

### Patch Changes

- 451dddd: chore: More build and package fixes
- a7a4885: fix: Fix builds and enable isolated declarations

## 0.4.0-alpha.3

### Patch Changes

- 8d1ac42: chore: Update lightning versions
- 8d1ac42: fix(focus): Fix case where FocusGroups sometimes get added to the wrong layer

## 0.4.0-alpha.2

### Patch Changes

- 1c9a5ac: feat(react-lightning): Add inViewport event from Lightning

## 0.4.0-alpha.1

### Patch Changes

- b5e7254: chore: Update lightning packages

## 0.4.0-alpha.0

### Minor Changes

- 63ec701: Move everything to React 19 and React Native 0.82

## 0.3.13

### Patch Changes

- e56cc1d: fix(focus): Don't attempt to focus elements with no size

## 0.3.12

### Patch Changes

- 10332b7: chore: Clean up some package typings

## 0.3.11

### Patch Changes

- 774d679: chore: Force package version bump

## 0.3.10

### Patch Changes

- ded4552: Updated lightning and storybook packages
- 65a90d4: chore: Package updates and dep cleanup

## 0.3.9

### Patch Changes

- 6425981: (focus) Do not pass in element to pushLayer

## 0.3.8

### Patch Changes

- 2968a78: Add support for reanimated animation builders

## 0.3.7

### Patch Changes

- bcc5e8c: Fix some issues with focus and layers

## 0.3.6

### Patch Changes

- 54622f2: Add support for focus layers, for example for Modals

## 0.3.5

### Patch Changes

- d7d750f: Fix initial focus on elements with focus redirection

## 0.3.4

### Patch Changes

- eb0c947: Added Focus Redirection support

## 0.3.3

### Patch Changes

- 2201571: Fixed react native entry rendering

## 0.3.2

### Patch Changes

- 56769e3: Include tseep into the build

## 0.3.1

### Patch Changes

- 81ff0f5: Various performance improvements
- c2fe33c: More optimizations with yoga workers
- 81ff0f5: Switch builds to use vite and update packages
- 4e58bb5: Remove useWasm RenderOption
- 81ff0f5: Removed effects and improved shaders

## 0.3.0

### Minor Changes

- 3c22b29: Change package scope from plexinc to plextv

## 0.2.8

### Patch Changes

- 2f2f8f2: Fix svg imageType not getting set in all cases

## 0.2.7

### Patch Changes

- d757a05: Adds support for svgs that use data urls
- f057984: Fix FocusManager sometimes getting into infinite loop

## 0.2.6

### Patch Changes

- d14b8f2: Fix simpleDiff to not error on nullish objects
- d14b8f2: Tweak focus logic to match W3C spatial navigation spec

## 0.2.5

### Patch Changes

- 680a2ef: Refactored focus management to be a little more performant and reliable

## 0.2.4

### Patch Changes

- 7155482: Update lightningjs renderer

## 0.2.3

### Patch Changes

- eb5907d: Fix issue with a prop name overriding an internal Lightning prop.
  Added some debug logging to prevent it from happening again.

## 0.2.2

### Patch Changes

- 2c7be90: Fix packages not importing properly in some cases

## 0.2.1

### Patch Changes

- 8406624: Fix rollup not building proper index files for absolute imports

## 0.2.0

### Minor Changes

- a793b9b: Clean up build configs for better support

### Patch Changes

- c86498e: Added onFocusCapture event for better react native support

## 0.1.6

### Patch Changes

- a4a409c: Added instrumentation for new lightning devtools

## 0.1.5

### Patch Changes

- a2d64f0: Fixed a bug where shaders can fail to update

## 0.1.4

### Patch Changes

- 3ef955a: Remove focusedStyle from FocusGroup
- 6bececd: Don't flatten array styles from LightningViewElement, moved to react-native

## 0.1.3

### Patch Changes

- c7589f6: Fixing cjs builds pt.2

## 0.1.2

### Patch Changes

- 341b33d: Fix cjs builds for packages to include es interop

## 0.1.1

### Patch Changes

- 1dfeb72: Updated packages

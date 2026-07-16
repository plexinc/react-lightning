# @plextv/react-native-lightning

## 0.4.3-alpha.1

### Patch Changes

- 5f304aa: Keep className-derived styles on style-only updates. Update payloads omit an unchanged className, so its resolved styles vanished from the style object and the flexbox plugin reset those props (a column screen re-laid out as a row after toggling display). The className plugin now remembers what it resolved per instance. Also: a dropped flexDirection resets to column (the node creation default, not the CSS row default), and addChildNode without an index appends at the parent's child count instead of index 0.
- a9a5dc3: Report PixelRatio 1 instead of window.devicePixelRatio. The Lightning canvas backing store equals the configured scene size, so one layout pixel is one canvas pixel; inheriting react-native-web's devicePixelRatio made image sizing fetch 2x assets on retina displays that the renderer downscales anyway: 4x the texture memory for no visible gain, enough to blow the texture manager's cleanup budget and evict visible tiles.
- Updated dependencies [edaeae2]
- Updated dependencies [5f304aa]
- Updated dependencies [895f6a9]
- Updated dependencies [badb2f6]
- Updated dependencies [0980f51]
- Updated dependencies [692445d]
- Updated dependencies [18eb21a]
- Updated dependencies [74aefc6]
- Updated dependencies [75738d7]
- Updated dependencies [5af32c0]
- Updated dependencies [0f901bd]
  - @plextv/react-lightning@0.4.3-alpha.1
  - @plextv/react-lightning-plugin-flexbox@0.4.3-alpha.1
  - @plextv/react-lightning-components@0.4.4-alpha.1

## 0.4.3-alpha.0

### Patch Changes

- 58a3c4d: Add a findNodeHandle export that returns the element ref instead of throwing (react-native-web's re-export throws unconditionally). Lightning focus APIs (setDestinations, focus hints) take element refs directly, so shared RN code that funnels refs through findNodeHandle now works unchanged.
- 9beb550: fix(image+border): flatten array styles on Image and paint/clear border shaders on live nodes

  The RN `Image` component built its node style with an object spread (`{ ...style, w, h }`), so an RN style array (`style={[a, b]}`) became numeric-keyed garbage and its `width`/`height`/`borderRadius` were silently dropped (the array-flatten polyfill only ran when the style reached `setProps` still an array). `Image` now flattens with `flattenStyles` before spreading.

  Border shaders can now be toggled on an already-mounted node. `border` and `borderColor` were missing from the set of style props that force the shader-creating slow path, so toggling a plain border (e.g. a focus ring) fast-pathed straight onto the node and never created a `Border` shader. A node that already carries a shader now always takes the slow path, and removing the border clears the shader (resetting the node to the stage default) instead of leaving it painting.

  Updating an existing shader's props in place now keys off whether the prop exists, not whether its current value is truthy. Previously a prop whose current value was falsy (e.g. a transparent `border-color` of `0`) was skipped, so toggling a focus-ring border from transparent to a visible color on a mounted node was silently dropped and the ring never appeared.

- 48f2025: fix(pressable): expose `focused` to function children

  `Pressable` tracked only `{ pressed }` in state and passed that to its style/children render functions, so `focused` was always `undefined`. Every focus-driven visual built on RN's `({ focused }) => …` contract — focus rings, focus scale — was dead on Lightning. It also only wired `onFocus`/`onBlur` to the node when the consumer passed those callbacks, so a focusable with no listeners tracked nothing.

  `Pressable` now tracks `focused` in state, updates it on focus/blur regardless of whether the consumer passes `onFocus`/`onBlur` (still forwarding to them), and passes `{ focused, pressed }` to its function children — matching React Native. The `pressed` setters no longer replace the whole state object, so a keypress can't clobber `focused`.

- Updated dependencies [6ced46f]
- Updated dependencies [e2a5e11]
- Updated dependencies [5237e31]
- Updated dependencies [8d0b8e8]
- Updated dependencies [df7da6a]
- Updated dependencies [69653c6]
- Updated dependencies [5e69f9c]
- Updated dependencies [c34f03c]
- Updated dependencies [ec4f817]
- Updated dependencies [3a9a0c7]
- Updated dependencies [4a7e3a4]
- Updated dependencies [f31d1d1]
- Updated dependencies [01a42e4]
- Updated dependencies [7005125]
- Updated dependencies [15fb74a]
- Updated dependencies [66c2c93]
- Updated dependencies [9beb550]
- Updated dependencies [6e50057]
- Updated dependencies [b2492c6]
- Updated dependencies [3f4ed43]
- Updated dependencies [660ae8d]
- Updated dependencies [658f68e]
- Updated dependencies [dded826]
- Updated dependencies [8d993ca]
- Updated dependencies [f6bee05]
- Updated dependencies [43594e7]
- Updated dependencies [0647e88]
- Updated dependencies [7f54f81]
- Updated dependencies [f2f0c11]
  - @plextv/react-lightning-plugin-css-transform@0.4.3-alpha.0
  - @plextv/react-lightning@0.4.3-alpha.0
  - @plextv/react-lightning-plugin-flexbox@0.4.3-alpha.0
  - @plextv/react-lightning-components@0.4.4-alpha.0

## 0.4.2

### Patch Changes

- 247d2e8: chore: Remove .cjs from packages
- Updated dependencies [247d2e8]
  - @plextv/react-lightning-components@0.4.2
  - @plextv/react-lightning-plugin-css-transform@0.4.2
  - @plextv/react-lightning@0.4.2
  - @plextv/react-lightning-plugin-flexbox@0.4.2

## 0.4.1

### Patch Changes

- 38f1b60: chore: Update dependencies and migrate from Biome to oxc
- 38f1b60: feat: Export `NativeCanvas` for embedding a Lightning canvas inside a React Native Lightning tree.
- Updated dependencies [38f1b60]
- Updated dependencies [38f1b60]
- Updated dependencies [38f1b60]
- Updated dependencies [38f1b60]
  - @plextv/react-lightning-components@0.4.1
  - @plextv/react-lightning@0.4.1
  - @plextv/react-lightning-plugin-css-transform@0.4.1
  - @plextv/react-lightning-plugin-flexbox@0.4.1

## 0.4.0

### Patch Changes

- dbaa0ed: fix(polyfill): Set loaded flags for elements on layout event, rather than inViewport
- b57bb68: fix: Fix measure function not returning in some cases
- dbaa0ed: feat(polyfill): Add requestTVFocus polyfill
- 8d1ac42: chore: Update lightning versions
- 848a0c1: chore: Dependency version bumps
- b23e312: fix: Remove FocusGroup in ScrollView
- 43bf756: fix(scrollview): Fix issue with focusable elements inside a scrollview
- 8d4ef27: fix(polyfill): Add missing dom functions needed by flashlist v2
- 34ddeb8: fix: Fix some typings with the FocusGroup and removed FocusableView
- b5e7254: chore: Update lightning packages
- 451dddd: chore: More build and package fixes
- a7a4885: fix: Fix builds and enable isolated declarations
- Updated dependencies [01d5f33]
- Updated dependencies [f9a9cab]
- Updated dependencies [264488a]
- Updated dependencies [848a0c1]
- Updated dependencies [8d4ef27]
- Updated dependencies [589da1b]
- Updated dependencies [8d1ac42]
- Updated dependencies [8c5ce17]
- Updated dependencies [1c9a5ac]
- Updated dependencies [848a0c1]
- Updated dependencies [b5e7254]
- Updated dependencies [8d1ac42]
- Updated dependencies [f9a9cab]
- Updated dependencies [451dddd]
- Updated dependencies [a7a4885]
- Updated dependencies [dbaa0ed]
  - @plextv/react-lightning@0.4.0
  - @plextv/react-lightning-plugin-flexbox@0.4.0
  - @plextv/react-lightning-plugin-css-transform@0.4.0

## 0.4.0-alpha.10

### Patch Changes

- 8d4ef27: fix(polyfill): Add missing dom functions needed by flashlist v2
- Updated dependencies [8d4ef27]
  - @plextv/react-lightning-plugin-flexbox@0.4.0-alpha.3

## 0.4.0-alpha.9

### Patch Changes

- dbaa0ed: fix(polyfill): Set loaded flags for elements on layout event, rather than inViewport
- dbaa0ed: feat(polyfill): Add requestTVFocus polyfill
- Updated dependencies [dbaa0ed]
  - @plextv/react-lightning@0.4.0-alpha.8

## 0.4.0-alpha.8

### Patch Changes

- b23e312: fix: Remove FocusGroup in ScrollView
- Updated dependencies [f9a9cab]
- Updated dependencies [f9a9cab]
  - @plextv/react-lightning@0.4.0-alpha.7

## 0.4.0-alpha.7

### Patch Changes

- b57bb68: fix: Fix measure function not returning in some cases
- Updated dependencies [01d5f33]
  - @plextv/react-lightning@0.4.0-alpha.5

## 0.4.0-alpha.6

### Patch Changes

- 34ddeb8: fix: Fix some typings with the FocusGroup and removed FocusableView

## 0.4.0-alpha.5

### Patch Changes

- 451dddd: chore: More build and package fixes
- a7a4885: fix: Fix builds and enable isolated declarations
- Updated dependencies [451dddd]
- Updated dependencies [a7a4885]
  - @plextv/react-lightning-plugin-css-transform@0.4.0-alpha.3
  - @plextv/react-lightning@0.4.0-alpha.4
  - @plextv/react-lightning-plugin-flexbox@0.4.0-alpha.2

## 0.4.0-alpha.4

### Patch Changes

- 8d1ac42: chore: Update lightning versions
- Updated dependencies [8d1ac42]
- Updated dependencies [8d1ac42]
  - @plextv/react-lightning-plugin-css-transform@0.4.0-alpha.2
  - @plextv/react-lightning@0.4.0-alpha.3

## 0.4.0-alpha.3

### Patch Changes

- Updated dependencies [8c5ce17]
- Updated dependencies [1c9a5ac]
  - @plextv/react-lightning-plugin-flexbox@0.4.0-alpha.1
  - @plextv/react-lightning@0.4.0-alpha.2

## 0.4.0-alpha.2

### Patch Changes

- 43bf756: fix(scrollview): Fix issue with focusable elements inside a scrollview

## 0.4.0-alpha.1

### Patch Changes

- b5e7254: chore: Update lightning packages
- Updated dependencies [b5e7254]
  - @plextv/react-lightning-plugin-css-transform@0.4.0-alpha.1
  - @plextv/react-lightning@0.4.0-alpha.1

## 0.4.0-alpha.0

### Minor Changes

- 63ec701: Move everything to React 19 and React Native 0.82

### Patch Changes

- Updated dependencies [63ec701]
  - @plextv/react-lightning-plugin-css-transform@0.4.0-alpha.0
  - @plextv/react-lightning@0.4.0-alpha.0
  - @plextv/react-lightning-plugin-flexbox@0.4.0-alpha.0

## 0.3.23

### Patch Changes

- 056a741: chore(react-native-lightning): One more typings fix

## 0.3.22

### Patch Changes

- 6bf5879: fix(react-native-lightning): Add back accidentally removed typings

## 0.3.21

### Patch Changes

- 10332b7: chore: Clean up some package typings
- Updated dependencies [10332b7]
- Updated dependencies [10332b7]
  - @plextv/react-lightning@0.3.12
  - @plextv/react-lightning-plugin-flexbox@0.3.14

## 0.3.20

### Patch Changes

- Updated dependencies [976b1a8]
  - @plextv/react-lightning-plugin-flexbox@0.3.13

## 0.3.19

### Patch Changes

- Updated dependencies [6b98299]
  - @plextv/react-lightning-plugin-flexbox@0.3.12

## 0.3.18

### Patch Changes

- Updated dependencies [62f280f]
  - @plextv/react-lightning-plugin-flexbox@0.3.11

## 0.3.17

### Patch Changes

- Updated dependencies [461defb]
  - @plextv/react-lightning-plugin-flexbox@0.3.10

## 0.3.16

### Patch Changes

- 774d679: chore: Force package version bump
- Updated dependencies [774d679]
  - @plextv/react-lightning-plugin-css-transform@0.3.5
  - @plextv/react-lightning@0.3.11
  - @plextv/react-lightning-plugin-flexbox@0.3.9

## 0.3.15

### Patch Changes

- ded4552: Updated lightning and storybook packages
- 65a90d4: chore: Package updates and dep cleanup
- Updated dependencies [ded4552]
- Updated dependencies [65a90d4]
  - @plextv/react-lightning-plugin-css-transform@0.3.4
  - @plextv/react-lightning-plugin-flexbox@0.3.8
  - @plextv/react-lightning@0.3.10

## 0.3.14

### Patch Changes

- 9b7fa5e: fix(react-native-lightning): Fix package publishing issue

## 0.3.13

### Patch Changes

- 1c600e1: fix(react-native-lightning): Don't set root in react-native.config

## 0.3.12

### Patch Changes

- Updated dependencies [021c531]
  - @plextv/react-lightning-plugin-css-transform@0.3.3

## 0.3.11

### Patch Changes

- Updated dependencies [81db081]
  - @plextv/react-lightning-plugin-flexbox@0.3.7
  - @plextv/react-lightning-plugin-css-transform@0.3.2

## 0.3.10

### Patch Changes

- 2968a78: Add support for reanimated animation builders
- Updated dependencies [2968a78]
  - @plextv/react-lightning@0.3.8
  - @plextv/react-lightning-plugin-css-transform@0.3.2
  - @plextv/react-lightning-plugin-flexbox@0.3.6

## 0.3.9

### Patch Changes

- bcc5e8c: Fix some issues with focus and layers
- Updated dependencies [bcc5e8c]
  - @plextv/react-lightning@0.3.7
  - @plextv/react-lightning-plugin-flexbox@0.3.6
  - @plextv/react-lightning-plugin-css-transform@0.3.2

## 0.3.8

### Patch Changes

- aed6819: Fix react-native polyfill to prevent multiple polyfills

## 0.3.7

### Patch Changes

- 712abe5: Prevent running react native polyfill multiple times

## 0.3.6

### Patch Changes

- eb0c947: Added Focus Redirection support
- Updated dependencies [eb0c947]
  - @plextv/react-lightning@0.3.4
  - @plextv/react-lightning-plugin-flexbox@0.3.5
  - @plextv/react-lightning-plugin-css-transform@0.3.2

## 0.3.5

### Patch Changes

- Updated dependencies [948b31b]
  - @plextv/react-lightning-plugin-flexbox@0.3.4
  - @plextv/react-lightning-plugin-css-transform@0.3.2

## 0.3.4

### Patch Changes

- Updated dependencies [d26a135]
  - @plextv/react-lightning-plugin-flexbox@0.3.3
  - @plextv/react-lightning-plugin-css-transform@0.3.2

## 0.3.3

### Patch Changes

- Updated dependencies [56769e3]
  - @plextv/react-lightning@0.3.2
  - @plextv/react-lightning-plugin-flexbox@0.3.2
  - @plextv/react-lightning-plugin-css-transform@0.3.2

## 0.3.2

### Patch Changes

- 81ff0f5: Flexbox performance improvements, and added optional useWebWorker option
- 81ff0f5: Various performance improvements
- 81ff0f5: Switch builds to use vite and update packages
- Updated dependencies [81ff0f5]
- Updated dependencies [81ff0f5]
- Updated dependencies [c2fe33c]
- Updated dependencies [81ff0f5]
- Updated dependencies [4e58bb5]
- Updated dependencies [81ff0f5]
  - @plextv/react-lightning-plugin-flexbox@0.3.1
  - @plextv/react-lightning@0.3.1
  - @plextv/react-lightning-plugin-css-transform@0.3.2

## 0.3.1

### Patch Changes

- Updated dependencies [2963dd8]
  - @plextv/react-lightning-plugin-css-transform@0.3.1

## 0.3.0

### Minor Changes

- 3c22b29: Change package scope from plexinc to plextv

### Patch Changes

- Updated dependencies [3c22b29]
  - @plextv/react-lightning-plugin-css-transform@0.3.0
  - @plextv/react-lightning@0.3.0
  - @plextv/react-lightning-plugin-flexbox@0.3.0

## 0.2.10

### Patch Changes

- 7037100: Fix css classnames plugin to work with older browsers

## 0.2.9

### Patch Changes

- Updated dependencies [2f2f8f2]
  - @plextv/react-lightning@0.2.8
  - @plextv/react-lightning-plugin-css-transform@0.2.8
  - @plextv/react-lightning-plugin-flexbox@0.2.8

## 0.2.8

### Patch Changes

- Updated dependencies [d757a05]
- Updated dependencies [f057984]
  - @plextv/react-lightning@0.2.7
  - @plextv/react-lightning-plugin-css-transform@0.2.7
  - @plextv/react-lightning-plugin-flexbox@0.2.7

## 0.2.7

### Patch Changes

- Updated dependencies [d14b8f2]
- Updated dependencies [d14b8f2]
  - @plextv/react-lightning@0.2.6
  - @plextv/react-lightning-plugin-css-transform@0.2.6
  - @plextv/react-lightning-plugin-flexbox@0.2.6

## 0.2.6

### Patch Changes

- 680a2ef: Refactored focus management to be a little more performant and reliable
- Updated dependencies [680a2ef]
  - @plextv/react-lightning@0.2.5
  - @plextv/react-lightning-plugin-css-transform@0.2.5
  - @plextv/react-lightning-plugin-flexbox@0.2.5

## 0.2.5

### Patch Changes

- 7155482: Update lightningjs renderer
- Updated dependencies [c531bf6]
- Updated dependencies [7155482]
  - @plextv/react-lightning-plugin-flexbox@0.2.4
  - @plextv/react-lightning-plugin-css-transform@0.2.4
  - @plextv/react-lightning@0.2.4

## 0.2.4

### Patch Changes

- eb5907d: Fix issue with a prop name overriding an internal Lightning prop.
  Added some debug logging to prevent it from happening again.
- Updated dependencies [eb5907d]
  - @plextv/react-lightning@0.2.3
  - @plextv/react-lightning-plugin-css-transform@0.2.3
  - @plextv/react-lightning-plugin-flexbox@0.2.3

## 0.2.3

### Patch Changes

- 27eec53: Alternate fix for FlashLists so item sizes get updated properly

## 0.2.2

### Patch Changes

- 2c7be90: Fix packages not importing properly in some cases
- Updated dependencies [2c7be90]
  - @plextv/react-lightning-plugin-css-transform@0.2.2
  - @plextv/react-lightning@0.2.2
  - @plextv/react-lightning-plugin-flexbox@0.2.2

## 0.2.1

### Patch Changes

- 8406624: Fix rollup not building proper index files for absolute imports
- Updated dependencies [8406624]
  - @plextv/react-lightning-plugin-css-transform@0.2.1
  - @plextv/react-lightning@0.2.1
  - @plextv/react-lightning-plugin-flexbox@0.2.1

## 0.2.0

### Minor Changes

- a793b9b: Clean up build configs for better support

### Patch Changes

- 5f26ca9: Update some component typings
- d87a081: Updated ScrollView and VirtualizedListView packages, and added a new FlashList implementation for RN
- Updated dependencies [a793b9b]
- Updated dependencies [c86498e]
- Updated dependencies [88d4ec5]
  - @plextv/react-lightning-plugin-css-transform@0.2.0
  - @plextv/react-lightning@0.2.0
  - @plextv/react-lightning-plugin-flexbox@0.2.0

## 0.1.9

### Patch Changes

- a4a409c: Added instrumentation for new lightning devtools
- Updated dependencies [a4a409c]
  - @plextv/react-lightning@0.1.6
  - @plextv/react-lightning-plugin-css-transform@0.1.9
  - @plextv/react-lightning-plugin-flexbox@0.1.9

## 0.1.8

### Patch Changes

- Updated dependencies [a2d64f0]
  - @plextv/react-lightning@0.1.5
  - @plextv/react-lightning-plugin-css-transform@0.1.8
  - @plextv/react-lightning-plugin-flexbox@0.1.8

## 0.1.7

### Patch Changes

- Updated dependencies [e0cd671]
  - @plextv/react-lightning-plugin-flexbox@0.1.7
  - @plextv/react-lightning-plugin-css-transform@0.1.7

## 0.1.6

### Patch Changes

- Updated dependencies [a42e9d6]
  - @plextv/react-lightning-plugin-flexbox@0.1.6
  - @plextv/react-lightning-plugin-css-transform@0.1.6

## 0.1.5

### Patch Changes

- Updated dependencies [81e885f]
  - @plextv/react-lightning-plugin-flexbox@0.1.5
  - @plextv/react-lightning-plugin-css-transform@0.1.5

## 0.1.4

### Patch Changes

- 3ef955a: Remove focusedStyle from FocusGroup
- b276845: Changed font name from Ubuntu to `sans-serif`
- 6bececd: Don't flatten array styles from LightningViewElement, moved to react-native
- cac433b: Update biome config
- Updated dependencies [3ef955a]
- Updated dependencies [6bececd]
  - @plextv/react-lightning@0.1.4
  - @plextv/react-lightning-plugin-css-transform@0.1.4
  - @plextv/react-lightning-plugin-flexbox@0.1.4

## 0.1.3

### Patch Changes

- c7589f6: Fixing cjs builds pt.2
- Updated dependencies [c7589f6]
  - @plextv/react-lightning-plugin-css-transform@0.1.3
  - @plextv/react-lightning-plugin-flexbox@0.1.3
  - @plextv/react-lightning@0.1.3

## 0.1.2

### Patch Changes

- 341b33d: Fix cjs builds for packages to include es interop
- Updated dependencies [341b33d]
  - @plextv/react-lightning-plugin-css-transform@0.1.2
  - @plextv/react-lightning-plugin-flexbox@0.1.2
  - @plextv/react-lightning@0.1.2

## 0.1.1

### Patch Changes

- 1dfeb72: Updated packages
- Updated dependencies [1dfeb72]
  - @plextv/react-lightning-plugin-css-transform@0.1.1
  - @plextv/react-lightning@0.1.1
  - @plextv/react-lightning-plugin-flexbox@0.1.1

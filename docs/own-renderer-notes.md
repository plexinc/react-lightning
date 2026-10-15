# Own renderer spike

Question: can react-lightning drop `@lightningjs/renderer` and render WebGL itself, with one scene-graph object per React element (no `LightningViewElement` wrapping a `CoreNode`, no prop syncing between them), and would that be faster on weak TVs?

Short answer at the bottom (Verdict). Everything here was measured in desktop Chrome 155 on an M1 Max with CPU throttling as a TV proxy. Nothing was run on a TV.

## 1. What we actually use from @lightningjs/renderer

Plex consumes the published packages (`@plextv/react-lightning@0.5.0-alpha.9` and friends) plus its own patches, not this repo's source, but the features below are present in both. "Plex" means the Plex Lightning app, directly or through react-native-lightning / the plugins.

| Feature | Used by Plex | Needed for MVP | Effort to own (eng-weeks) |
|---|---|---|---|
| Node x/y/w/h, alpha, color (0xRRGGBBAA), zIndex, parent | yes | yes (done) | done |
| scaleX/scaleY/rotation (css transform), mountX/mountY (ImageComponent) | yes | scale/rotate done, mount no | 0.2 |
| colorTop/Bottom/Left/Right/corners, rtt, autosize, srcX/Y/W/H, strictBounds | no | no | 0 |
| clipping (overflow hidden, VirtualList) | yes | yes (CPU clip + scissor fallback) | done |
| clipRadius (roundedClipping on, Plex patches a nested stencil clip stack) | yes | no | 1-1.5 |
| boundsMargin per node (VirtualList draw distance) | yes | global margin only | 0.3 |
| ImageTexture via src, textureOptions.resizeMode cover/contain + clipX/clipY, imageType svg | yes | src only | 1 |
| texture.state / texture.dimensions, loaded / failed / inViewport events, renderState (ImageComponent) | yes | onLoad only | 0.5 |
| Color/Noise/Sub/RenderTexture, createTexture, custom texture types | no | no | 0 |
| Shaders: Rounded (number or 4-tuple), Border (per side), RoundedWithBorder, outline (align outside + gap) | yes | uniform radius + uniform border only | 1 |
| Shaders: custom LinearGradient, UltraBlur, SpinnerArc, SocialProofAvatarMask (WebGlShaderType) | yes | no | 1.5-2 (needs a custom-program path) |
| Shadow, HolePunch, RadialGradient, *WithShadow | no | no | 0 |
| shader prop animation (transition.shaderProps, outlineColor transitions) | yes | no | 0.5 |
| node.animate(): duration, delay, easing strings incl. cubic-bezier and steps, function easings, loop; controller stop/pause/start/waitUntilStopped, 'stopped'/'tick' events | yes (plugin-reanimated, ImageComponent, Spinner) | numeric tweens on fields, 4 easings, no controller | 1-1.5 |
| SDF text (msdf atlases for InterDisplay x4 weights, PlexCircular), canvas text (plex-icons font) | yes | canvas text only | 2-3 (see text below) |
| Text props: fontFamily/Size/Style/Weight, lineHeight, letterSpacing, textAlign, maxLines, contain, overflowSuffix, wordBreak, maxWidth/maxHeight | yes | family/size/weight, lineHeight, maxWidth, maxLines, align, ellipsis | included above |
| plugin-flexbox text measuring (mirrors SDF layout from the msdf JSON, no renderer API) | yes | no (fixed positions) | needs to mirror canvas metrics instead |
| Stage events: frameTick (NodeResizeObserver), idle/active (Plex idle throttle), fpsUpdate (unused) | yes | no | 0.3 |
| stage.targetFrameTime, requestRender, sortChildren | yes | render-on-dirty only | 0.2 |
| Inspector (Plex testIdInspectorPlugin, dev and e2e only) | e2e | no | 1 (DOM overlay for testIDs) |
| RendererMain options: appWidth/Height, clearColor transparent (video below), numImageWorkers, device pixel ratios, fonts, shaders | yes | width/height/clearColor | 0.5 (DPR scaling) |
| Canvas2D render engine (useCanvas) | no (commented out) | no | 0 |
| Platform layer (WebPlatform rAF loop, idle loop, image workers), WebPlatformLegacy | default only | rAF on dirty, createImageBitmap or img.decode | done-ish |

Plex also reads renderer objects directly in a few places (`ImageComponent.lng.tsx` touches `node.texture`, `node.animate`, `renderState`, `mountX`; `testIdInspectorPlugin.ts` writes `node.data`), so those files move with any renderer change.

Things worth knowing from the inventory: `textOverflow` is written but isn't a 3.1.1 prop (inert), and `rtt` is typed but never set. The layout write path is `setNodeProp('x'|'y'|'w'|'h')` from plugin-flexbox's `LightningManager`, which also subscribes to about eight element events (childAdded/Removed/Moved, destroy, stylesChanged, propsChanged, textChanged, inViewport, textureLoaded). That glue, not Yoga, is what couples layout to `LightningViewElement`.

## 2. MVP design (packages/renderer)

`@plextv/react-lightning-renderer` (about 1,400 lines, WebGL1, builds with `target: es2017`, no OffscreenCanvas, feature-detects `createImageBitmap`, `img.decode` and `queueMicrotask`).

- `SceneNode` is the host instance. React's `createInstance` returns it, props are plain fields written by `applyProps` (one switch per style key, no allocations, no diff object), and writers set dirty bits (transform, alpha, order, text, src). There is no second object and nothing to sync.
- `Stage` runs one rAF only when something is dirty or animating. A single traversal recomputes world matrix/alpha only where a node or an ancestor is dirty, culls against the viewport, lazily requests images and rasterizes text for nodes near the viewport, and emits quads. Subtrees that are hidden or clipped out keep their dirty bits and are skipped.
- `QuadBatcher` has one program and one interleaved vertex buffer (52 bytes/vertex). Rounded corners and borders are per-vertex attributes evaluated with a rounded-rect SDF in the fragment shader, so a rounded poster, a rounded badge and a focus ring batch with plain quads. Up to 8 textures per draw (if-chain sampler select, WebGL1-safe). The whole frame is uploaded with one `bufferSubData`, then one `drawElements` per batch.
- Clipping: axis-aligned quads are clipped on the CPU (quad, UVs and SDF coords shrink), so clipping never breaks a batch. Rotated content inside a clip falls back to scissor. Rounded clipping isn't done; it needs either the stencil (like Plex's patched renderer) or an SDF mask per quad (cheap for one level, ugly for nested).
- `TextureManager`: refcounted cache by URL, LRU of unreferenced textures with a byte cap, uploads capped per frame, fetch + `createImageBitmap` (off-thread decode) with an `Image` + `decode()` fallback. Missing: freeing textures of mounted but offscreen nodes, which Lightning does and a long Plex session needs.
- `TextRasterizer`: canvas 2D layout (word widths cached per font, layout cached per style key), wrap, maxLines, ellipsis by binary search, rasterized white and tinted in the shader, one texture per distinct string+style shared by refcount. No SDF (not cheap: it's the msdf atlas loader, glyph layout and a second shader).
- `Animator`: numeric tweens on node fields, started by `applyProps` when a `transition` entry exists for the key (never on mount).
- `react/`: host config for react-reconciler 0.33.0 accepting the same `lng-view` / `lng-text` / `lng-image` tags and Lightning-style props (`x,y,w,h,color,alpha,scale,zIndex,clipping,borderRadius,border,fontSize,...`, `transition`, `src`).

Layout: fixed positions. Reusing Yoga is feasible (YogaManager is independent), but `LightningManager` is written against the element event API, so it would need a rewrite against `SceneNode` hooks (about 1.5-2.5 weeks). Not done for the spike, and both bench variants use fixed positions so the comparison is renderer plus element layer only, not layout.

## 3. Benchmark

`apps/renderer-bench`: one React scene (`src/scene.tsx`) rendered by (a) `current.html`: react-lightning createRoot + @lightningjs/renderer 3.1.1 (WebGL, SDF Ubuntu font, Border/Rounded/RoundedWithBorder shaders, 2 image workers, no plugins), and (b) `mvp.html`: the MVP. 10 rows x 12 tiles; each tile is a scaled container, a rounded poster, a rounded badge with text, two text lines with ellipsis and a bordered focus ring shown with alpha. Rows scroll by translating a clipped track (200 ms transition), the column scrolls by y (200 ms), the focused tile scales 1.08 (150 ms). 882 elements. Both use React.memo on rows/tiles, so React work is the same.

`run/bench.mjs`: headless Chrome over CDP, new tab and cleared cache per run, probe injected before page scripts (wraps rAF to time each callback and WebGL calls to count draws/uploads), variants alternate within each round, 7 rounds at CPU throttle 1x/4x/6x. Sequences: 20 key steps 300 ms apart (each animates fully) and a 10-key burst 70 ms apart. `run/summarize.mjs` prints medians and IQR. Headless Chrome here drives frames on its own (`Page.bringToFront` + focus emulation), so no screenshot ticker was needed.

Caveats on the numbers:
- GPU: ANGLE on Metal on an M1 Max. GPU time says nothing about a TV GPU, so I only report CPU/main-thread time and draw-call counts. Fill rate and fragment cost of the rounded-rect shader on Mali/PowerVR TV GPUs are unknown.
- The machine was loaded by other agents (load average 10-23 on 10 cores during runs, see `uptime` lines in the results), which is why the task-duration numbers are noisy. rAF callback time and draw counts are stable.
- CPU throttling slows JS but not the GPU, the network stack or image decode threads. A real TV is slower at all of them.

Results, medians of 7 alternating rounds with the IQR in brackets (raw: `apps/renderer-bench/run/full2.jsonl`, regenerate with `node run/bench.mjs 7 1,4,6 results.jsonl && node run/summarize.mjs results.jsonl`):

```
                                       4x current        4x mvp            6x current        6x mvp
mount: React commit ms                 105 [100-113]     29 [28-30]        153 [144-176]     44 [43-48]
mount: to first drawn frame ms         157 [139-164]     78 [74-83]        227 [212-261]     130 [124-136]
mount: to last drawn frame ms          217 [190-227]     163 [156-168]     317 [298-369]     259 [254-274]
mount: main-thread task ms             206 [196-227]     117 [110-120]     309 [292-354]     190 [182-200]
JS heap after mount (GC'd) MB          6.2               1.4               6.2               1.4
heap objects per element               178               21                (same)            (same)
steps: renderer frame median ms        4.6 [2.7-6.0]     0.5 [0.5-0.8]     5.8 [3.6-11.8]    0.5 [0.5-0.6]
steps: renderer frame p95 ms           20 [15-33]        7.5 [5.9-30]      42 [30-83]        9.2 [8.8-11]
steps: renderer (rAF) ms per step      88 [59-112]       23 [19-61]        99 [84-110]       33 [27-43]
steps: all JS ms per step              95 [65-138]       26 [23-83]        108 [96-136]      41 [33-64]
steps: main-thread task ms per step    126 [96-203]      88 [49-218]       160 [138-242]     75 [65-129]
steps: frames drawn (20 steps)         213               249               159               238
draw calls per frame                   132               9                 132               9
texture uploads during steps           62                69                62                69
steps: key to drawn frame median ms    26 [22-44]        8 [6-53]          38 [36-104]       14 [11-17]
burst (70 ms keys): JS ms per key      60 [41-68]        14 [9-34]         47 [45-68]        15 [13-19]
burst: key to drawn frame p95 ms       138 [66-260]      33 [32-179]       177 [72-264]      35 [32-38]
```

At 1x the same picture: renderer frame 2.2 vs 0.4 ms, mount commit 26 vs 7 ms, all JS per step 35 vs 20 ms.

Bundle, min+gz (terser, react external): react-lightning core alone 58.6 KB / 16.0 KB, react-lightning + @lightningjs/renderer 276 KB / 73.8 KB (so the renderer is about 217 KB / 58 KB, including the lazily loaded canvas shader chunks), MVP renderer + host config 27.2 KB / 9.8 KB. react-reconciler is about 120 KB / 36 KB on top in both.

How to read it:
- The big win is the renderer frame, not the element layer. The non-rAF JS per step (React commit plus element/prop syncing) is roughly 7 ms vs 3 ms at 4x; the rAF part is 88 vs 23 ms. Profiling the current stack during steps, the top self time is in Lightning's frame: `CoreShaderNode` update/setUpdateType, per-draw `enableVertexAttribArray`/`vertexAttribPointer`/uniform setup, `bindRenderOp`, `draw`. That's the 132 draw calls: every node with a Rounded or Border shader (posters, badges, the ring) is its own render op, because shader props are uniforms. The MVP puts radius/border in vertex attributes and batches up to 8 textures per draw.
- Mount: the element + CoreNode construction is where the 3.5x commit difference comes from (two objects per element, event subscriptions, style proxy, prop transform pipeline, shader objects). 178 vs 21 heap objects per element; 21 includes React's own fiber/props/style objects.
- The MVP draws about 50% more frames in the step test (it keeps 60 fps through every 200 ms transition, the current stack drops frames at 4-6x), and still spends a third of the JS.
- Texture memory (33 MB vs 8.6 MB) and the mount upload counts mostly reflect policy, not design: Lightning loads images further outside the viewport and holds a 4 MB SDF atlas. Don't count it as a win.
- The MVP uploads more textures while scrolling (69 vs 62) because every new string is a canvas texture; SDF text needs no uploads. On a TV with a slow canvas and slow texImage2D that cost moves into the frame. One data point already: switching the text canvas to `willReadFrequently` made the first frame 4x slower in desktop Chrome (33 vs 9 ms for 26 strings), so canvas text behaviour depends on the browser's canvas backend and has to be measured per device.
- Not measured and only answerable on a TV: GPU fill and fragment cost (the SDF branch runs on every rounded poster pixel, as Lightning's Rounded shader does), WebGL driver overhead per draw on Mali/PowerVR (where 132 vs 9 draws probably matters more than here), image decode and upload speed, canvas text speed and memory, and whether the main-thread savings survive the real TV's thread scheduling.
- The step-latency p95 (about 300 ms in both) is an artefact of my key-to-commit matching and is left out. Task-duration numbers are noisy because the machine was shared.


## 4. Verdict

What works in the MVP: View/Text/Image with Lightning-style props through the same JSX, one SceneNode per element as the host instance, world transform/alpha propagation only where dirty, viewport culling with lazy image/text loading, z-order, CPU clipping with scissor fallback, batched rounded rects and borders (uniform radius/width), image textures with refcount/LRU cap and off-thread decode, canvas text with wrap/maxLines/ellipsis and caches, numeric transitions, render-on-dirty frame loop. Rendering matches the current stack visually in the bench scene.

What's missing for the Plex app, ranked by how much it blocks, with rough engineer-weeks:
1. The element API everything else talks to (3-5). react-native-lightning polyfills (View/Text/Image/ScrollView, setNativeProps, measure, onLayout), plugin-css-transform output, plugin-reanimated, FocusManager (getBoundingClientRect, visibility, parent walks), VirtualList (boundsMargin, direct x/y writes), Plex's ImageComponent and inspector plugin all use `LightningElement` and `node.*`. Either SceneNode grows that API (and some of the per-element cost comes back) or every consumer is ported.
2. Layout glue (1.5-2.5): rewrite plugin-flexbox's LightningManager against SceneNode hooks; text measuring has to mirror whatever text renderer we pick.
3. Text (2-3): Plex uses msdf fonts in four weights plus a canvas icon font. Canvas text means new metrics (layout shifts), a text atlas or memory blows up (one texture per string, about 29 KB per tile title), letterSpacing by hand (ctx.letterSpacing is Chrome 99+). Porting Lightning's SDF handler instead is possible (MIT) but is most of its text code.
4. Shaders (2.5-3): per-corner radius, per-side borders, outlines, custom LinearGradient/UltraBlur/SpinnerArc/SocialProofAvatarMask (needs a custom-program path that breaks batches), shader prop animation.
5. Textures and memory (1.5-2): free textures of offscreen mounted nodes (the MVP never does, Lightning does), resizeMode cover/contain with clip offsets, SVG, texture state/events/renderState, per-node bounds margin.
6. Animation controller parity (1-1.5): cubic-bezier/steps/function easings, loop, delay, stop/pause/waitUntilStopped, stopped/tick events.
7. Rounded clipping with nesting (1-1.5), DPR scaling for 720p devices, transparent clear over video, idle/frameTick/targetFrameTime, context loss (1-1.5 together).
8. e2e inspector replacement (1).
9. Device matrix QA and WebGL1 quirk fixing on webOS/Tizen/X1 (3-4).

Roughly 18-28 engineer-weeks to parity, so 4-6 months for one person, plus owning a renderer forever after.

Risks: old Chrome WebGL1 drivers (highp support in fragment shaders, sampler if-chains, NPOT textures, max texture units, uniform/varying limits on Mali-400 class GPUs, context loss on suspend); texture memory on 1 GB TVs with per-string text textures; canvas 2D speed varies wildly between devices; Comcast X1 runs WPE, which has WebGL1, so this should run there technically, but the belief that X1 requires Lightning is a platform or certification question I can't answer from code, and if it's true we'd maintain two renderers, which kills most of the point; the maintenance cost of a renderer nobody upstream shares.

Recommendation: go on a subset, conditional on TV numbers. Not a full replacement yet.
- First run this bench (`apps/renderer-bench`, it's static files) on two or three real TVs. If the renderer frame isn't the dominant cost on device, stop here.
- In parallel, try the two cheap wins on the current stack, because the measurements say that's where most of the gain is: batch Rounded/Border/RoundedWithBorder in Lightning by moving radius/border into vertex attributes (132 to about 10 draws here) and stop re-binding vertex attributes per draw; and slim the element layer at mount (the 178 objects per element). Both are patches to a dependency we already patch, measurable with the same bench in days.
- If after that the TV numbers still show the Lightning frame and node layer as the bottleneck, and Comcast confirms X1 doesn't need Lightning, the own renderer is a credible path: the MVP shows 3-4x less JS per step, 3.5x faster mount commit and about 8x fewer objects per element, in about 1,400 lines. Budget it as a 4-6 month project, keep react-lightning's element API as the boundary at first (SceneNode implements it) so plugins and Plex code don't all move at once, and decide SDF vs canvas text on device data.


## 5. Compat layer: the real Plex app on the MVP renderer

`packages/renderer/src/compat` (`@plextv/react-lightning-renderer/compat` plus `/webgl`, `/canvas`, `/inspector`, `/utils`, `/platforms`, `/webgl/shaders`) stands in for the slice of `@lightningjs/renderer` 3.1.1 that react-lightning 0.5.0-alpha.9 and the Plex app touch. Everything above it (react-lightning, react-native-lightning, plugin-flexbox, css-transform, reanimated, FocusManager, VirtualList, Plex code) runs unchanged. Only react-lightning imports the renderer at runtime (`RendererMain`, `WebGlCoreRenderer`, `SdfTextRenderer`, `CanvasTextRenderer`, `CanvasCoreRenderer`, the shader modules); Plex adds `Inspector` and type-only imports.

What it maps: CoreNode/CoreTextNode props as prototype accessors over underscored fields (so react-lightning's dev "reserved prop" check stays quiet), `parent`/`children`/`sortChildren`, renderState + `inViewport`/`inBounds`/`outOfBounds` events (queued until the frame ends), image `src`/`texture` with `loaded`/`failed` payloads and `texture.state`/`dimensions`, resizeMode cover/contain, mountX/Y, `node.animate()` with Lightning's controller semantics (start values read at creation, `stop()` resets, `stopped`/`tick`/`animating`, cubic-bezier and named easings, loop, `stopMethod: 'reverse'`, shaderProps), `frameTick`/`fpsUpdate` on the renderer and `idle`/`active` on `stage.eventBus`, `targetFrameTime`. Shaders: Rounded, Border, RoundedWithBorder (numeric or string align, gap, per-side widths as extra quads), LinearGradient and UltraBlur as per-vertex-color quads, all in the same batch. Text: line breaking with the msdf JSON advances and kerning (so it agrees with plugin-flexbox's measurement), drawn by canvas from the original TTF, w/h setters on text nodes become maxWidth/maxHeight like Lightning's.

Since then: SpinnerArc, SocialProofAvatarMask, UltraBlur's dither and canvas text are extra modes of the one batch shader (packed into the per-vertex texture slot, so no extra draws); per-corner radii factored like Lightning's; outline rings sit outside again (shader prop animations were tweening `border-align: 'outside'` to 0); text uses Lightning's own layout engine, the SDF baseline (BMFont base minus half the distance range, within 0.5 px of stock now), a hanging baseline for canvas fonts like the icon font, glyphs spaced to the SDF advances and coverage squared so the weight is closer to SDF; text rasters share up to three 4 MB atlas pages; nodes beyond the bounds margin give their textures back (64 MB cap, atlas included); context loss is recovered; angled LinearGradients are exact. Home draws in 3 calls.

Not done or approximated: rounded clipping (innermost clip only, evaluated as the child quad's SDF, so it fails for children with their own radius; no case on Home or the detail page shows it), RTT, device pixel ratio (Plex doesn't set one), Inspector (no-op, so no testID DOM mirror). Canvas text still differs from SDF text in anti-aliasing and is snapped to whole-pixel baselines.

Run it: from the app's `apps/plex/targets/lightning`, `LNG_DEV_PORT=3421 node_modules/.bin/tsx <this repo>/apps/renderer-bench/plex/dev-compat.mts` serves the app with a runtime renderer switch: `?renderer=own|stock` or F9 (stored in `localStorage["lng.renderer"]`, default stock, badge bottom-left). Every `@lightningjs/renderer*` import goes to `/__renderer/<entry>.js`, which the server redirects by cookie to a module re-exporting either the stock prebundle or the compat files; both stay out of the react-lightning prebundle. No change to the app repo.

Home scroll (8 down, 8 up, 700 ms apart), headless Chrome 155, M1 Max, alternating runs, medians of 5 (`apps/renderer-bench/plex/measure.jsonl`):

```
metric                                      4x stock (n=5)            4x compat (n=5)           6x stock (n=5)            6x compat (n=5)           
renderer frame median ms (drawing frames)   6.80 [6.4-6.9]            1.50 [1.4-1.5]            8.30 [8.3-8.5]            2.30 [1.9-2.4]            
renderer frame p95 ms                       10.5 [10.1-11.9]          3.80 [3.6-4.9]            14.9 [14.7-15.3]          10.9 [6.3-11.3]           
renderer rAF ms total (drawing frames)      2737.0 [2471.8-3017.6]    854.1 [839.2-883.0]       2441.0 [2368.3-2460.3]    958.7 [894.4-1035.5]      
all rAF callbacks ms total                  2862.4 [2578.1-3161.2]    951.1 [929.0-974.6]       2551.1 [2477.9-2568.6]    1048.8 [963.4-1128.4]     
frames drawn                                405.0 [365.0-457.0]       458.0 [422.0-480.0]       283.0 [263.0-288.0]       271.0 [200.0-315.0]       
draw calls per frame median                 203.0 [203.0-209.0]       5.00 [5.0-5.0]            203.0 [202.0-203.0]       5.00 [5.0-5.0]            
draw calls per frame p95                    270.0 [270.0-274.0]       5.00 [5.0-5.0]            266.0 [259.0-270.0]       5.00 [5.0-5.0]            
texture uploads                             130.0 [130.0-132.0]       128.0 [127.0-128.0]       130.0 [130.0-154.0]       133.0 [128.0-141.0]       
main-thread task s (TaskDuration)           10.8 [10.7-10.9]          7.67 [7.0-8.2]            10.9 [10.9-11.0]          10.3 [9.4-10.5]           
script s (ScriptDuration)                   9.25 [9.1-9.3]            7.14 [6.5-7.6]            9.51 [9.5-9.6]            9.77 [8.8-10.0]           
JS heap after GC MB (Home, before)          94.5 [93.6-95.3]          90.5 [90.2-92.2]          95.2 [94.9-95.6]          90.2 [90.2-90.3]          
JS heap after GC MB (after scroll)          98.6 [98.5-99.9]          93.9 [93.7-95.3]          98.0 [98.0-98.6]          93.6 [93.4-93.6]          
renderer nodes                              443.0 [442.0-446.0]       444.0 [444.0-445.0]       443.0 [442.0-443.0]       444.0 [444.0-444.0]       
```

Load average was 8-27 on 10 cores during the runs (other agents), and rose through the campaign, so the main-thread and script totals are noisy; compat's grew with load while stock's sat near the wall-time cap. The renderer frame and draw-call numbers are stable. Same 444 renderer nodes in both once `zIndexLocked` stayed undefined (a 0 there made react-lightning materialize 250 flattened views).


## 6. Direct elements: react-native-webtv

The compat layer (section 5) still runs two objects per React element: react-lightning's `LightningViewElement` (tseep emitter, style Proxy, a dozen bound closures) and a compat `CoreNode` imitating Lightning's node, with props built into an object and `Object.assign`ed from one to the other. `@plextv/react-native-webtv` (`packages/react-native-webtv`) drops the second object.

Design. react-lightning's `createRoot` takes a `backend` (`RendererBackend`, `render/RendererBackend.ts`): it builds the renderer and can bring an `elementFactory` for the host instances. The default is the stock renderer and react-lightning's own classes, moved to `render/lightningBackend.ts` and loaded on demand, so an app that passes nothing gets exactly today's behaviour (that's the only react-lightning change besides exporting `getNodeResizeObserver`, `isTranslateSettled` and `MAX_UNSETTLED_LAYOUTS`; a clean PR on its own). react-native-webtv has one entry with `createRoot(target, { renderer: 'lightning' | 'webtv', ...renderOptions })` (default `lightning`), and subpaths `/lightning` and `/webtv` exporting each backend, so an app that imports one directly never bundles the other.

The `webtv` backend's elements are one class, `SceneElement` (`src/scene/SceneElement.ts`): the LightningViewElement/TextElement/ImageElement API (kind field instead of subclasses) on an object that is also the scene node `CompatStage` draws, with the same field names as compat's `CoreNode` (`_x`, `_flags`, `_wa`, `_tp`, `_texture`, ...). `element.node === element`. Lightning's node props are prototype accessors over those fields, so `el.node.x = v` (VirtualList scrolling), `node.animate()`, `node.texture`, `node.on('loaded')` (Plex's ImageComponent) and setNodeProp from plugin-flexbox all land on the one object. Prop updates are one pass of field writes, with the exact rules of `_toLightningNodeProps` + `Object.assign` (style after props, shader/texture/clipRadius, then x/y/w/h/alpha with the flattening offsets), no intermediate object. Events are a flat `[event, listener, once]` array created on the first listener, instead of a tseep emitter plus a Lightning emitter plus three forwarding listeners. The style Proxy is created on first `el.style` read (plugin-flexbox reads it for every tracked element, so mostly it still exists), with a handler object instead of two closures.

Why not merge the classes the other way (make compat's CoreNode the element) or write elements from scratch on the core `SceneNode`: the plugins and react-native-lightning depend on `instanceof LightningViewElement` (ScrollView, useFocusHandler, the resize observer shim) and patch `LightningViewElement.prototype` (setProps wrapper for style arrays, `measure*`, `setNativeProps`, DOM accessors). `SceneElement.prototype`'s chain goes through `LightningViewElement.prototype` without running its constructor, and it deliberately doesn't define `setProps`, so the polyfill wrapper still runs. The core `Stage`/`SceneNode` lacks most of what Plex needs (shaders, msdf-matched text layout, resizeMode, Lightning animation semantics), all of which is in CompatStage, so the elements draw through CompatStage. The cost is one field-name contract between them.

Renderer hooks (small, separable, overlap with the improvement branch noted): CompatStage reads render children from `node._kids` instead of `node.children` (an element's `children` are its element children, which differ from its render children for flattened views) and delivers stage events through `node._emitRender(name, data)`; compat's CoreNode keeps `children` as a getter over `_kids`, implements `_emitRender` and destroys children from a copy. New `compat/scene.ts` (`@plextv/react-lightning-renderer/compat/scene`) exports what the elements need. Those are 4 changed lines in CompatStage.ts, the rest is in CoreNode.ts (not touched on ruud/own-renderer-improve). `packages/renderer` stays where it is: react-native-webtv imports it from `@plextv/react-lightning-renderer`. Once the improvement branches are merged it can move in (renderer core + compat stage under react-native-webtv, the compat `@lightningjs/renderer` imitation dropped unless we want to keep the third option).

Behaviour differences, all deliberate and covered by `src/scene/parity.spec.ts` where observable (it runs the same element scripts against both implementations on a WebGL-free compat stage, with and without flattening and with plugin-css-transform, and compares the drawn tree, element state and every event the plugins listen to):
- Props that aren't Lightning node props (handlers, `testID`, `focusable`, ...) aren't copied onto the node. They were inert on a `CoreNode`; reading them back through `element.node` now gives `undefined`. `setNativeProps` writes node props only for the same reason (on the merged object an `Object.assign` would hit element setters).
- `element.node.parent`, `.children`, `.id` and `.destroy()` are the element's, not a render node's: there is no render node. Nothing in react-lightning, the plugins, react-native-lightning or Plex reads those through `.node` (grepped).
- The container root (CanvasRoot's FocusGroup view) can't swap its node for `renderer.root`; it takes renderer.root's values and becomes its only child, which draws the same.
- Listeners get exactly the arguments emitted; tseep pads them with `undefined` to a fixed arity.
- No dev-mode "reserved CoreNode prop" warnings (there's no CoreNode to protect).
- Everything the compat stage doesn't draw yet (section 5: SDF text, nested rounded clipping, RTT, inspector, ...) is the same gap here.

Run it: from the app's `apps/plex/targets/lightning`, `LNG_DEV_PORT=3491 node_modules/.bin/tsx <this repo>/apps/renderer-bench/plex/dev-compat.mts`, then `?renderer=stock|compat|direct` (`own` still works for compat) or F9 cycling stock -> compat -> direct, badge bottom-left (`renderer: direct`). The launcher now serves every `@plextv` package the app imports from this worktree's source in all three modes (the app's installed alpha.9 copies don't have the backend hook), so stock/compat/direct compare the same react-lightning code; numbers in section 5 were taken against the installed packages and aren't comparable with the ones below. In direct mode `@plextv/react-lightning`'s `createRoot` is routed through react-native-webtv with `renderer: 'webtv'` (`switch/react-lightning.ts`). `LNG_BUILD=stock|own|direct LNG_BUILD_OUT=<dir>` builds one mode for production and `LNG_PREVIEW_PORT=<port>` with the same variables serves it.


### Results

Same harness as section 5, extended to three modes (`apps/renderer-bench/plex/direct/`: bench.mjs, bench-load.mjs, campaign*.sh, summarize*.mjs, raw dev-*.jsonl): one headless Chrome 155 per mode with its own profile (the app falls back to Who's watching when its tab is hidden), bfcache off, screenshot ticker every 50 ms, M1 Max. Home Down/Up: reload, pick the profile, settle 3 s without a drawn frame or long task, throttle, Down, 3 s, Up, 3 s. Home load: from the Enter on the profile to 3 s without a drawn frame or long task, throttled from the Enter. 5 rotating rounds per throttle, runs repeated when the 1-min load average went over 20 (none did; it was 6-18). Medians, IQR in brackets. "Compat" is LightningViewElement on the compat CoreNode (section 5), "direct" is react-native-webtv's SceneElement; both draw through the same CompatStage.

Dev server (what the launcher serves; React and the plugins run their dev builds):

Home Down/Up, 1x

| Metric | Stock | Compat | Direct |
|---|---|---|---|
| Renderer frame time, median (ms) | 0.90 [0.90-0.90] | 0.20 [0.20-0.30] | 0.20 [0.20-0.20] |
| Renderer frame time, p95 (ms) | 1.40 [1.40-1.50] | 0.40 [0.40-0.40] | 0.30 [0.30-0.30] |
| Frames drawn | 235 [235-236] | 220 [218-220] | 219 [219-220] |
| Draw calls per frame, median | 204 [204-204] | 5.00 [5.00-5.00] | 5.00 [5.00-5.00] |
| Texture uploads | 2.00 [2.00-22.0] | 11.0 [11.0-12.0] | 11.0 [11.0-11.0] |
| Main-thread task time (s) | 0.55 [0.54-0.55] | 0.28 [0.28-0.28] | 0.27 [0.27-0.27] |
| Script time (s) | 0.39 [0.39-0.40] | 0.21 [0.20-0.21] | 0.19 [0.19-0.19] |
| Long tasks (count) | 0.00 [0.00-0.00] | 0.00 [0.00-0.00] | 0.00 [0.00-0.00] |
| Long tasks (total ms) | 0.00 [0.00-0.00] | 0.00 [0.00-0.00] | 0.00 [0.00-0.00] |
| Key-to-first-drawn-frame, Down (ms) | 54.2 [52.5-57.5] | 38.5 [38.2-39.2] | 36.9 [36.7-37.6] |
| Key-to-first-drawn-frame, Up (ms) | 34.4 [27.3-43.8] | 9.10 [8.20-13.9] | 8.60 [8.00-9.80] |
| JS heap after window, post-GC (MB) | 94.9 [94.8-95.0] | 92.2 [90.1-92.9] | 88.3 [88.3-88.4] |
| Elements | 850 [850-850] | 850 [850-850] | 850 [850-850] |
| Renderer nodes | 443 [443-443] | 445 [445-445] | 438 [438-440] |
| Load avg 1-min (start/end max) | 15.1 [11.9-15.4] | 15.1 [10.8-16.0] | 14.1 [10.8-15.3] |

Home Down/Up, 4x

| Metric | Stock | Compat | Direct |
|---|---|---|---|
| Renderer frame time, median (ms) | 3.50 [3.50-3.70] | 0.90 [0.80-1.00] | 0.60 [0.60-0.70] |
| Renderer frame time, p95 (ms) | 5.90 [5.80-5.90] | 1.60 [1.30-1.80] | 1.30 [1.20-1.30] |
| Frames drawn | 222 [222-225] | 212 [211-212] | 212 [212-213] |
| Draw calls per frame, median | 203 [203-203] | 5.00 [5.00-5.00] | 5.00 [5.00-5.00] |
| Texture uploads | 2.00 [2.00-22.0] | 11.0 [11.0-11.0] | 11.0 [11.0-11.0] |
| Main-thread task time (s) | 1.96 [1.92-2.06] | 0.94 [0.90-1.02] | 0.90 [0.90-0.91] |
| Script time (s) | 1.42 [1.41-1.50] | 0.74 [0.71-0.81] | 0.69 [0.68-0.69] |
| Long tasks (count) | 1.00 [1.00-2.00] | 1.00 [1.00-3.00] | 1.00 [1.00-1.00] |
| Long tasks (total ms) | 159 [158-215] | 143 [143-256] | 141 [139-142] |
| Key-to-first-drawn-frame, Down (ms) | 194 [190-241] | 184 [184-189] | 180 [178-181] |
| Key-to-first-drawn-frame, Up (ms) | 65.5 [46.5-67.2] | 37.5 [36.9-44.1] | 36.5 [36.3-37.6] |
| JS heap after window, post-GC (MB) | 94.8 [94.8-95.4] | 90.1 [90.0-90.1] | 88.4 [88.3-88.4] |
| Elements | 850 [850-850] | 850 [850-850] | 850 [850-850] |
| Renderer nodes | 443 [443-443] | 445 [445-445] | 438 [438-438] |
| Load avg 1-min (start/end max) | 15.3 [10.8-16.0] | 14.8 [10.2-16.1] | 15.3 [10.2-16.1] |

Home load, 1x

| Metric | Stock | Compat | Direct |
|---|---|---|---|
| Main-thread task time (s) | 0.86 [0.83-1.03] | 0.71 [0.60-0.76] | 0.72 [0.71-0.73] |
| Script time (s) | 0.64 [0.62-0.78] | 0.48 [0.47-0.59] | 0.58 [0.56-0.58] |
| Long tasks (count) | 3.00 [3.00-5.00] | 2.00 [2.00-3.00] | 3.00 [3.00-3.00] |
| Long tasks (total ms) | 410 [403-541] | 309 [305-373] | 366 [357-383] |
| Frames drawn | 159 [157-159] | 137 [137-137] | 139 [139-140] |
| Renderer rAF ms total | 102 [93.8-104] | 52.8 [49.3-54.2] | 47.1 [46.1-47.7] |
| Texture uploads | 74.0 [74.0-94.0] | 63.0 [63.0-64.0] | 65.0 [65.0-65.0] |
| JS heap post-GC (MB) | 94.6 [92.6-96.6] | 90.5 [89.4-92.3] | 90.6 [90.4-90.6] |
| Load avg (max) | 7.08 [6.51-7.46] | 7.81 [7.08-8.05] | 7.26 [7.04-7.42] |

Home load, 4x

| Metric | Stock | Compat | Direct |
|---|---|---|---|
| Main-thread task time (s) | 3.03 [2.98-3.14] | 2.84 [2.23-2.97] | 2.10 [2.08-2.16] |
| Script time (s) | 2.34 [2.33-2.46] | 2.44 [1.95-2.55] | 1.81 [1.79-1.82] |
| Long tasks (count) | 6.00 [5.00-6.00] | 7.00 [4.00-7.00] | 4.00 [4.00-4.00] |
| Long tasks (total ms) | 1832 [1741-1907] | 2078 [1661-2166] | 1520 [1473-1532] |
| Frames drawn | 120 [120-122] | 99.0 [99.0-114] | 104 [101-118] |
| Renderer rAF ms total | 319 [311-326] | 174 [165-176] | 151 [147-155] |
| Texture uploads | 124 [74.0-124] | 64.0 [63.0-65.0] | 63.0 [63.0-63.0] |
| JS heap post-GC (MB) | 94.2 [94.0-94.5] | 91.4 [89.4-91.9] | 87.8 [87.7-88.0] |
| Load avg (max) | 6.61 [6.08-6.73] | 7.00 [6.52-7.23] | 6.31 [6.22-7.58] |

Production builds (`LNG_BUILD=<mode>` per mode, served by `vite preview`, same harness; this is the closer one to a TV build):

Home Down/Up, 1x

| Metric | Stock | Compat | Direct |
|---|---|---|---|
| Renderer frame time, median (ms) | 0.50 [0.50-0.60] | 0.20 [0.20-0.20] | 0.20 [0.20-0.20] |
| Renderer frame time, p95 (ms) | 0.90 [0.90-0.90] | 0.40 [0.40-0.40] | 0.30 [0.30-0.30] |
| Frames drawn | 236 [234-238] | 220 [220-221] | 220 [220-221] |
| Draw calls per frame, median | 201 [201-202] | 5.00 [5.00-5.00] | 5.00 [5.00-5.00] |
| Texture uploads | 2.00 [2.00-22.0] | 11.0 [11.0-11.0] | 11.0 [11.0-11.0] |
| Main-thread task time (s) | 0.32 [0.31-0.33] | 0.22 [0.22-0.23] | 0.21 [0.21-0.21] |
| Script time (s) | 0.25 [0.24-0.25] | 0.15 [0.15-0.16] | 0.14 [0.14-0.14] |
| Long tasks (count) | 0.00 [0.00-0.00] | 0.00 [0.00-0.00] | 0.00 [0.00-0.00] |
| Long tasks (total ms) | 0.00 [0.00-0.00] | 0.00 [0.00-0.00] | 0.00 [0.00-0.00] |
| Key-to-first-drawn-frame, Down (ms) | 43.7 [42.9-44.2] | 13.0 [12.9-13.9] | 12.2 [12.0-12.2] |
| Key-to-first-drawn-frame, Up (ms) | 43.3 [28.7-45.3] | 9.20 [4.80-12.6] | 5.20 [4.50-8.80] |
| JS heap after window, post-GC (MB) | 32.3 [32.3-33.6] | 30.6 [30.6-31.8] | 28.7 [28.7-28.7] |
| Elements | 850 [850-850] | 850 [850-850] | 850 [850-850] |
| Renderer nodes | 435 [435-435] | 437 [437-437] | 438 [438-438] |
| Load avg 1-min (start/end max) | 5.41 [5.20-5.56] | 5.99 [5.75-6.90] | 5.57 [5.04-5.89] |

Home Down/Up, 4x

| Metric | Stock | Compat | Direct |
|---|---|---|---|
| Renderer frame time, median (ms) | 2.20 [2.10-2.30] | 0.70 [0.70-0.70] | 0.60 [0.60-0.60] |
| Renderer frame time, p95 (ms) | 3.90 [3.70-4.00] | 1.40 [1.40-1.40] | 1.30 [1.20-1.30] |
| Frames drawn | 236 [234-236] | 218 [218-219] | 218 [217-220] |
| Draw calls per frame, median | 202 [202-249] | 5.00 [5.00-5.00] | 5.00 [5.00-5.00] |
| Texture uploads | 2.00 [2.00-22.0] | 11.0 [11.0-11.0] | 11.0 [11.0-11.0] |
| Main-thread task time (s) | 1.15 [1.13-1.35] | 0.72 [0.71-0.72] | 0.69 [0.68-0.73] |
| Script time (s) | 0.96 [0.93-1.12] | 0.54 [0.53-0.55] | 0.50 [0.50-0.51] |
| Long tasks (count) | 1.00 [1.00-3.00] | 1.00 [1.00-1.00] | 0.00 [0.00-1.00] |
| Long tasks (total ms) | 55.0 [55.0-191] | 55.0 [54.0-55.0] | 0.00 [0.00-50.0] |
| Key-to-first-drawn-frame, Down (ms) | 82.8 [60.2-85.9] | 61.9 [58.3-63.1] | 56.8 [53.5-57.4] |
| Key-to-first-drawn-frame, Up (ms) | 42.5 [32.9-46.5] | 18.5 [18.4-19.1] | 17.8 [16.8-18.5] |
| JS heap after window, post-GC (MB) | 32.3 [32.3-33.8] | 30.6 [30.6-30.6] | 28.7 [28.7-28.7] |
| Elements | 850 [850-850] | 850 [850-850] | 850 [850-850] |
| Renderer nodes | 435 [435-435] | 437 [437-437] | 438 [438-438] |
| Load avg 1-min (start/end max) | 5.67 [5.47-6.30] | 5.69 [5.11-5.91] | 6.04 [5.66-6.17] |

Home load, 1x

| Metric | Stock | Compat | Direct |
|---|---|---|---|
| Main-thread task time (s) | 0.41 [0.41-0.42] | 0.35 [0.34-0.36] | 0.30 [0.30-0.31] |
| Script time (s) | 0.30 [0.29-0.30] | 0.23 [0.23-0.23] | 0.21 [0.21-0.21] |
| Long tasks (count) | 1.00 [1.00-2.00] | 1.00 [1.00-1.00] | 1.00 [1.00-1.00] |
| Long tasks (total ms) | 88.0 [87.0-136] | 82.0 [78.0-84.0] | 74.0 [74.0-76.0] |
| Frames drawn | 171 [160-173] | 148 [146-149] | 150 [148-150] |
| Renderer rAF ms total | 81.5 [79.4-84.1] | 47.8 [47.6-47.8] | 43.5 [42.8-43.5] |
| Texture uploads | 94.0 [74.0-124] | 63.0 [63.0-63.0] | 63.0 [63.0-63.0] |
| JS heap post-GC (MB) | 31.8 [31.8-31.8] | 30.0 [28.9-30.1] | 28.2 [28.2-28.2] |
| Load avg (max) | 5.42 [5.11-5.99] | 5.75 [5.66-6.46] | 5.20 [4.82-5.31] |

Home load, 4x

| Metric | Stock | Compat | Direct |
|---|---|---|---|
| Main-thread task time (s) | 1.48 [1.44-1.49] | 1.22 [1.21-1.22] | 1.14 [1.14-1.20] |
| Script time (s) | 1.17 [1.15-1.18] | 0.94 [0.93-0.95] | 0.87 [0.85-0.88] |
| Long tasks (count) | 3.00 [2.00-3.00] | 3.00 [3.00-3.00] | 3.00 [3.00-3.00] |
| Long tasks (total ms) | 641 [610-657] | 618 [617-630] | 566 [561-583] |
| Frames drawn | 142 [132-144] | 124 [124-125] | 126 [111-129] |
| Renderer rAF ms total | 281 [263-286] | 159 [158-160] | 144 [142-147] |
| Texture uploads | 124 [124-124] | 63.0 [63.0-63.0] | 63.0 [63.0-64.0] |
| JS heap post-GC (MB) | 31.7 [31.7-31.7] | 30.0 [30.0-30.1] | 28.2 [28.1-28.2] |
| Load avg (max) | 6.04 [5.84-6.25] | 5.41 [5.23-6.01] | 5.89 [5.13-5.90] |

Enter-to-Home times are mostly the PMS and plex.tv requests (they're bimodal, cache warm or not), so they're left out.

Element microbench (`ELEMENT_COST=1 NODE_OPTIONS=--expose-gc pnpm exec vitest run elementCost --pool=forks` in packages/react-native-webtv): 300 tiles of view > view > image + text with plugin-css-transform, flattening and rounded clipping on, both on the compat stage, Node 24, medians of 10 rounds:

```
compat  mount 5.8 us/el, restyle 0.88, layout writes 12.08, destroy 0.56; retained 2836 B/el, 48.4 heap objects/el
direct  mount 2.58 us/el, restyle 0.61, layout writes 1.2, destroy 0.35; retained 1486 B/el, 18.1 heap objects/el
```

How to read it. Against stock, direct keeps everything section 5 found (renderer frame 0.6 vs 2.2 ms at 4x in production, 5 vs 202 draw calls, about 40% less main-thread time). Against compat, direct takes the element layer down: 2.3x cheaper mounts, 10x cheaper layout write-back, 18 vs 48 heap objects and 1.5 vs 2.8 KB per element in the microbench, which on Home shows as 4-14% less main-thread time than compat in the production runs (Down/Up 0.69 vs 0.72 s at 4x, load 1.14 vs 1.22 s at 4x and 0.30 vs 0.35 s at 1x; 2.10 vs 2.84 s on the dev-server load at 4x, no difference there at 1x), 2 MB less heap (28.2 vs 30.0 MB in production) and a slightly cheaper renderer frame (0.6 vs 0.7 ms at 4x, probably fewer object shapes in CompatStage's traversal). In the dev-server CPU profiles (100 us sampling, Home load and Down/Up at 4x), the element layer's self time went from 41 to 18 ms on load and from 57 to 34 ms on Down/Up, and GC on load from 30 to 17 ms. The rest of the frame didn't change, which is why the totals move less than the element numbers: the element layer was already the smaller part once the renderer was replaced.

What's still slow, ranked by self time in the direct dev profile of Down/Up at 4x (823 ms busy in the 6 s window):
1. Renderer frame, 208 ms: CompatStage `_visit` 72, `_draw` 26, texture uploads 15, `_drawText` 11, QuadBatcher vertex writes 10, `computeWorld` 9. That's the improvement branch's area (ruud/own-renderer-improve).
2. Flexbox, 195 ms: yoga wasm about 70, `YogaManager._getUpdatedStyles` 32, `LightningManager._applyUpdates` 26 (it reads `el.style` through the Proxy several times per element per pass, which is most of the 7 ms the style trap costs).
3. React, 190 ms, of which `jsxDEV` alone is 113: dev-build only. In production the whole Down/Up is 0.69 s of task time at 4x.
4. App code and misc, 140 ms.
5. GC, 36 ms.
6. Element layer, 34 ms: style Proxy trap 7, event emits 3, the update slow path 3, setNodeProp 3.
7. css-transform, reanimated and the RN polyfills, 20 ms.

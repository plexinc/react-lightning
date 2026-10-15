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

Not done or approximated: SpinnerArc and SocialProofAvatarMask (not drawn / unmasked), rounded clipping (innermost clip only, evaluated as the child quad's SDF, so it fails for children with their own radius), per-corner radii (max wins), RTT, device pixel ratio, Inspector (no-op, so no testID DOM mirror), context loss, freeing textures of mounted offscreen nodes. Text sits about 1-2 px lower than SDF text.

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

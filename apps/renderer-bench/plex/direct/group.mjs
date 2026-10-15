// node group.mjs <a.cpuprofile> [b.cpuprofile ...]: self time grouped by layer.
import { readFileSync } from 'node:fs';
const groups = [
  ['element layer', /element\/|scene\/SceneElement|compat\/CoreNode|tseep|FlattenedRendererNode|compat\/EventEmitter|createHostConfig|mapReactPropsToLightning|simpleDiff/],
  ['renderer frame', /compat\/(CompatStage|Animation|Shaders|TextLayout|Fonts|timing)|QuadBatcher|TextureManager|TextRasterizer|drawElements|bufferSubData|texImage2D|texSubImage2D/],
  ['flexbox', /plugin-flexbox|yoga|wasm-function|LightningManager|YogaManager/],
  ['css/reanimated/rn plugins', /plugin-css-transform|convertCSS|plugin-reanimated|react-native-lightning\/src|reactNativePolyfills|domPolyfills/],
  ['react', /react-reconciler|react_jsx|react_compiler|react\.js|scheduler/],
  ['gc', /^\(garbage collector\)/],
];
for (const file of process.argv.slice(2)) {
  const p = JSON.parse(readFileSync(file, 'utf8'));
  const byId = new Map(p.nodes.map((x) => [x.id, x]));
  const tot = new Map();
  let busy = 0;
  for (let i = 0; i < p.samples.length; i++) {
    const cf = byId.get(p.samples[i]).callFrame;
    const us = p.timeDeltas[i + 1] ?? 0;
    if (cf.functionName === '(idle)' || cf.functionName === '(program)') continue;
    busy += us;
    const key = `${cf.functionName} ${cf.url}`;
    const g = groups.find(([, re]) => re.test(key) || re.test(cf.functionName))?.[0] ?? 'other (app, fetch, misc)';
    tot.set(g, (tot.get(g) ?? 0) + us);
  }
  console.log(`\n${file}  busy ${(busy / 1000).toFixed(1)} ms`);
  for (const [g, us] of [...tot].sort((a, b) => b[1] - a[1])) console.log(`  ${(us / 1000).toFixed(1).padStart(7)}  ${g}`);
}

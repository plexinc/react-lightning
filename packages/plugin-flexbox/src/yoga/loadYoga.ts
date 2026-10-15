import type { Yoga } from 'yoga-layout/load';

import wrapAssembly from './vendor/wrapAssembly.js';
import loadYogaImpl from './vendor/yoga-wasm-mvp.js';

/**
 * Same as `loadYoga` from `yoga-layout/load`, but with the wasm lowered to
 * WebAssembly MVP so it runs on Chrome 57+ (the upstream build needs 74).
 */
export async function loadYoga(): Promise<Yoga> {
  return wrapAssembly(await loadYogaImpl());
}

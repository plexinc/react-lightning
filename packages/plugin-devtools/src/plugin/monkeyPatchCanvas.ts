// Patches canvas to set `preserveDrawingBuffer` so we can grab screenshots
export function monkeyPatchCanvas() {
  const oldContext = HTMLCanvasElement.prototype.getContext;

  // @ts-expect-error - Override getContext to set preserveDrawingBuffer
  HTMLCanvasElement.prototype.getContext = function (contextId, options) {
    return oldContext.call(this, contextId, {
      ...options,
      preserveDrawingBuffer: true,
    });
  };
}

import type { RendererMain as LightningRendererMain } from '@lightningjs/renderer';

import { CompatStage, CoreNode, RendererMain } from '@plextv/react-lightning-renderer/compat';
import { AnimationManager, Shaders } from '@plextv/react-lightning-renderer/compat/scene';

type AnyRecord = Record<string, unknown>;

/**
 * The compat RendererMain and CompatStage without WebGL: everything the elements call, no frame loop.
 * Both element implementations draw through this stage, so their scene trees can be compared.
 */
export function createTestRenderer(): LightningRendererMain {
  const stage = Object.create(CompatStage.prototype) as CompatStage & AnyRecord;
  const shTypes: AnyRecord = {
    Rounded: Shaders.Rounded,
    Border: Shaders.Border,
    RoundedWithBorder: Shaders.RoundedWithBorder,
    LinearGradient: Shaders.LinearGradient,
  };

  Object.assign(stage, {
    _warned: new Set<string>(),
    renders: 0,
    shManager: {
      shTypes,
      registerShaderType: (name: string, type: unknown) => (shTypes[name] = type),
    },
    animations: new AnimationManager(() => {}),
    requestRender() {
      (this as AnyRecord).renders = ((this as AnyRecord).renders as number) + 1;
    },
    warnOnce() {},
    releaseTexture(node: AnyRecord) {
      if (node._texture) {
        (node._texture as AnyRecord).gl = null;
      }
    },
    releaseText() {},
  });

  const root = new CoreNode(stage);

  root._w = 1920;
  root._h = 1080;
  (stage as AnyRecord).root = root;

  const renderer = Object.create(RendererMain.prototype) as RendererMain & AnyRecord;

  Object.assign(renderer, { eventListeners: {}, stage, root, settings: {} });

  return renderer as unknown as LightningRendererMain;
}

type SceneLike = AnyRecord & {
  _kids?: SceneLike[];
  children?: SceneLike[];
  isTextNode?: boolean;
  _tp?: AnyRecord | null;
  _shader?: { shaderType: string; props: AnyRecord } | null;
  _texture?: { type: string; props: AnyRecord } | null;
};

/**
 * The drawn tree from the container root, as plain data: renderer.root for the stock elements
 * (they swap their node for it), the root element itself for SceneElement (it sits under it).
 */
export function snapshotScene(renderer: LightningRendererMain): unknown {
  const root = (renderer as unknown as { root: SceneLike }).root;
  const kids = (root._kids ?? []) as SceneLike[];
  const start = kids.length === 1 && kids[0]?.isRoot === true ? kids[0] : root;

  const walk = (node: SceneLike): unknown => {
    const kids = (node._kids ?? []) as SceneLike[];
    const tp = node._tp;

    return {
      text: node.isTextNode ? tp?.text : undefined,
      tp: node.isTextNode ? { ...tp } : undefined,
      x: node._x,
      y: node._y,
      w: node._w,
      h: node._h,
      alpha: node._alpha,
      color: node._color,
      scale: [node._scaleX, node._scaleY],
      rotation: node._rotation,
      mount: [node._mountX, node._mountY],
      zIndex: node._zIndex,
      clipping: node._clipping,
      clipRadius: node._clipRadius,
      shader: node._shader
        ? { type: node._shader.shaderType, props: { ...node._shader.props } }
        : null,
      texture: node._texture
        ? { type: node._texture.type, props: { ...node._texture.props } }
        : null,
      imageType: node._imageType,
      children: kids.map(walk),
    };
  };

  return walk(start);
}

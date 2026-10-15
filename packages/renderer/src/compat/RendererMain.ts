import { CompatStage } from './CompatStage';
import { CoreNode, CoreTextNode } from './CoreNode';
import { EventEmitter } from './EventEmitter';
import type { CompatShader } from './Shaders';
import type { TextProps } from './TextLayout';

type Settings = {
  appWidth?: number;
  appHeight?: number;
  clearColor?: number;
  boundsMargin?: number | number[];
  fpsUpdateInterval?: number;
  deviceLogicalPixelRatio?: number;
  devicePhysicalPixelRatio?: number;
  textureMemory?: { criticalThreshold?: number };
  [key: string]: unknown;
};

type Props = Record<string, unknown>;

declare global {
  interface Window {
    __compatRenderer?: RendererMain;
  }
}

/**
 * Drop-in for @lightningjs/renderer's RendererMain, backed by the spike's
 * batched WebGL renderer. Only the surface react-lightning and the Plex app
 * use is implemented; the rest warns once.
 */
export class RendererMain extends EventEmitter {
  public readonly stage: CompatStage;
  public readonly root: CoreNode;
  public readonly canvas: HTMLCanvasElement;
  public readonly settings: Settings;
  public inspector: unknown = null;

  public constructor(settings: Settings, target: string | HTMLElement) {
    super();
    this.settings = settings;

    const el = typeof target === 'string' ? document.getElementById(target) : target;

    if (!el) {
      throw new Error(`Renderer target ${String(target)} not found`);
    }

    const canvas = document.createElement('canvas');

    el.appendChild(canvas);
    this.canvas = canvas;

    const margin = settings.boundsMargin;

    this.stage = new CompatStage(canvas, {
      appWidth: settings.appWidth ?? 1920,
      appHeight: settings.appHeight ?? 1080,
      clearColor: settings.clearColor ?? 0x00000000,
      boundsMargin: typeof margin === 'number' ? margin : Array.isArray(margin) ? (margin[0] ?? 100) : 100,
      fpsUpdateInterval: settings.fpsUpdateInterval || 1000,
      deviceLogicalPixelRatio: settings.deviceLogicalPixelRatio ?? 1,
      devicePhysicalPixelRatio: settings.devicePhysicalPixelRatio ?? 1,
    });
    this.stage.emitter = this;
    this.root = this.stage.root;
    window.__compatRenderer = this;
  }

  public createNode(props: Props): CoreNode {
    const node = new CoreNode(this.stage);

    applyProps(node, props);

    return node;
  }

  public createTextNode(props: Props): CoreTextNode {
    const tp: TextProps = {
      text: (props.text as string) || '',
      fontFamily: (props.fontFamily as string) || 'sans-serif',
      fontSize: (props.fontSize as number) || 16,
      fontStyle: (props.fontStyle as string) || 'normal',
      textAlign: (props.textAlign as string) || 'left',
      verticalAlign: (props.verticalAlign as string) || 'top',
      letterSpacing: (props.letterSpacing as number) || 0,
      lineHeight: (props.lineHeight as number) || 1.2,
      maxLines: (props.maxLines as number) || 0,
      maxWidth: (props.maxWidth as number) || 0,
      maxHeight: (props.maxHeight as number) || 0,
      overflowSuffix: (props.overflowSuffix as string) ?? '...',
      wordBreak: (props.wordBreak as string) || 'break-word',
      contain: (props.contain as string) || 'none',
      offsetY: (props.offsetY as number) || 0,
    };
    const node = new CoreTextNode(this.stage, tp);

    applyProps(node, props, TEXT_KEYS);

    return node;
  }

  public destroyNode(node: CoreNode): void {
    node.destroy();
  }

  public createShader(type: string, props?: Props): CompatShader {
    return this.stage.createShader(type, props);
  }

  public createTexture(type: string, props: Props) {
    return this.stage.createTexture(type, props);
  }

  public requestRender(): void {
    this.stage.requestRender();
  }

  public rerender(): void {
    this.stage.requestRender();
  }

  public setBoundsMargin(value: number | number[]): void {
    this.stage.setBoundsMargin(value);
  }

  public setClearColor(color: number): void {
    (this.stage.options as { clearColor: number }).clearColor = color;
    this.stage.requestRender();
  }

  public toggleFreeze(): void {}

  public advanceFrame(): void {}

  public cleanup(): void {}

  public getBufferInfo(): null {
    return null;
  }
}

// Lightning's text node takes w/h from the initial props as-is (not as maxWidth), and lays out over them anyway.
const TEXT_KEYS = new Set([
  'w',
  'h',
  'width',
  'height',
  'text',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'textAlign',
  'verticalAlign',
  'letterSpacing',
  'lineHeight',
  'maxLines',
  'maxWidth',
  'maxHeight',
  'overflowSuffix',
  'wordBreak',
  'contain',
  'offsetY',
]);

function applyProps(node: CoreNode, props: Props, skip?: Set<string>): void {
  let parent: CoreNode | null | undefined;

  for (const key in props) {
    const value = props[key];

    if (value === undefined || (skip && skip.has(key))) {
      continue;
    }

    if (key === 'parent') {
      parent = value as CoreNode | null;
      continue;
    }

    (node as unknown as Props)[key] = value;
  }

  if (parent) {
    node.parent = parent;
  }
}

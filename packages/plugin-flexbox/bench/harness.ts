import { LightningManager } from '../src/LightningManager';
import type { YogaManager } from '../src/YogaManager';
import { BENCH_FONT, benchAtlasUrl } from './atlas';
import type { Fixture, NodeSpec } from './fixtures';

// Minimal element surface LightningManager reads. Mirrors the fake used in the
// unit tests, plus text fields so the grow-only remeasure path runs.
type Handler = (...args: unknown[]) => void;

let nextId = 1;

class BenchElement {
  public id = nextId++;
  public parent: BenchElement | null = null;
  public children: BenchElement[] = [];
  public isTextElement = false;
  public isImageElement = false;
  public text?: string;
  public style: Record<string, unknown> = {};
  public props: { style: Record<string, unknown> } = { style: {} };
  public rawProps: { style: Record<string, unknown> } = { style: {} };
  public node: Record<string, unknown> = {};
  public hasLayout = false;

  private _handlers = new Map<string, Set<Handler>>();

  public on(event: string, handler: Handler): () => void {
    let set = this._handlers.get(event);
    if (!set) {
      set = new Set();
      this._handlers.set(event, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  public emit(event: string, ...args: unknown[]): void {
    const set = this._handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) handler(...args);
  }

  public withholdPaintUntilLayout(): void {}

  public setNodeProp(key: string, value: unknown): boolean {
    if (this.node[key] === value) return false;
    this.node[key] = value;
    return true;
  }

  public emitLayoutEvent(): void {
    this.hasLayout = true;
  }
}

export type Metrics = {
  nodeCount: number;
  layoutPasses: number;
  settles: number;
  maxPassesToSettle: number;
  reflows: number;
  textRemeasures: number;
  ms: number;
};

const asLng = (el: BenchElement) => el as unknown as import('@plextv/react-lightning').LightningElement;

function makeElement(spec: NodeSpec): BenchElement {
  const el = new BenchElement();
  const style = { ...(spec.style ?? {}) } as Record<string, unknown>;
  if (spec.text != null) {
    el.isTextElement = true;
    el.text = spec.text;
    style.fontFamily = style.fontFamily ?? BENCH_FONT;
  }
  el.style = style;
  el.props.style = style;
  el.rawProps.style = style;
  return el;
}

// Build a cell subtree, mark its root as an independent flex root (as
// VirtualListCell does). Returns every element created, leaves last, so the
// caller can tear it down in reverse.
function mountCell(manager: LightningManager, spec: NodeSpec, crossSize?: number): BenchElement[] {
  const created: BenchElement[] = [];

  const build = (node: NodeSpec, parent: BenchElement | null): BenchElement => {
    const el = makeElement(node);
    manager.trackElement(asLng(el));
    manager.applyStyle(el.id, el.style, true);
    created.push(el);

    if (parent) {
      el.parent = parent;
      parent.children.push(el);
      parent.emit('childAdded', el, parent.children.length - 1);
    }

    for (const child of node.children ?? []) {
      build(child, el);
    }
    return el;
  };

  const root = build(spec, null);
  if (crossSize != null) {
    root.style.w = crossSize;
    manager.applyStyle(root.id, { w: crossSize }, true);
  }
  manager.markFlexRoot(asLng(root));

  return created;
}

function destroyCell(manager: LightningManager, els: BenchElement[]): void {
  for (let i = els.length - 1; i >= 0; i--) {
    els[i]!.emit('destroy');
  }
}

async function drain(): Promise<void> {
  for (let i = 0; i < 4; i++) await Promise.resolve();
}

export async function runFixture(fixture: Fixture): Promise<Metrics> {
  nextId = 1;
  const manager = new LightningManager();
  await manager.init({
    fonts: [{ fontFamily: BENCH_FONT, atlasDataUrl: benchAtlasUrl }],
  });

  const yoga = (manager as unknown as { _yogaManager: YogaManager })._yogaManager;

  // Metrics wiring.
  let layoutPasses = 0;
  let settles = 0;
  let passesSinceAction = 0;
  let maxPassesToSettle = 0;
  let reflows = 0;
  const lastSize = new Map<number, string>();

  yoga.on('render', (buffer: ArrayBuffer) => {
    layoutPasses++;
    passesSinceAction++;
    const view = new DataView(buffer);
    for (let o = 0; o + 20 <= buffer.byteLength; o += 20) {
      const id = view.getUint32(o, true);
      const w = view.getInt32(o + 12, true);
      const h = view.getInt32(o + 16, true);
      const key = `${w}x${h}`;
      const prev = lastSize.get(id);
      if (prev !== undefined && prev !== key) reflows++;
      lastSize.set(id, key);
    }
  });

  yoga.on('settled', () => {
    settles++;
    if (passesSinceAction > maxPassesToSettle) maxPassesToSettle = passesSinceAction;
    passesSinceAction = 0;
  });

  // Count text remeasures beyond each node's first.
  let textRemeasures = 0;
  const seenTextMeasure = new Set<number>();
  const origSetTextMeasure = yoga.setTextMeasure.bind(yoga);
  (yoga as unknown as { setTextMeasure: typeof yoga.setTextMeasure }).setTextMeasure = ((
    id: number,
    ...rest: unknown[]
  ) => {
    if (seenTextMeasure.has(id)) textRemeasures++;
    else seenTextMeasure.add(id);
    // @ts-expect-error passthrough
    return origSetTextMeasure(id, ...rest);
  }) as typeof yoga.setTextMeasure;

  const start = performance.now();

  // Mount the initial window.
  const mounted: BenchElement[][] = [];
  for (let i = 0; i < fixture.window; i++) {
    passesSinceAction = 0;
    mounted.push(mountCell(manager, fixture.cell(i), fixture.cellCrossSize));
    await drain();
  }

  // Scroll: recycle top -> bottom.
  for (let step = 0; step < fixture.scrollSteps; step++) {
    const top = mounted.shift();
    if (top) destroyCell(manager, top);
    passesSinceAction = 0;
    mounted.push(mountCell(manager, fixture.cell(fixture.window + step), fixture.cellCrossSize));
    await drain();
  }

  const ms = performance.now() - start;

  return {
    nodeCount: nextId - 1,
    layoutPasses,
    settles,
    maxPassesToSettle,
    reflows,
    textRemeasures,
    ms: Math.round(ms * 10) / 10,
  };
}

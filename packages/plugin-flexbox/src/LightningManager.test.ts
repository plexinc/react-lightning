import { describe, expect, it } from 'vitest';

import type { LightningElement } from '@plextv/react-lightning';
import { LightningManager } from './LightningManager';
import type { YogaManager } from './YogaManager';

type Handler = (...args: unknown[]) => void;

// Just enough element surface for trackElement's listeners and markFlexRoot.
class FakeElement {
  public id: number;
  public parent: FakeElement | null = null;
  public children: FakeElement[] = [];
  public isTextElement = false;
  public isImageElement = false;
  public props: { style: Record<string, unknown> } = { style: {} };
  public rawProps: { style: Record<string, unknown> } = { style: {} };
  public style: Record<string, unknown> = {};
  public node: Record<string, unknown> = {};
  public hasLayout = false;

  private _handlers = new Map<string, Set<Handler>>();

  constructor(id: number) {
    this.id = id;
  }

  public on(event: string, handler: Handler): () => void {
    let set = this._handlers.get(event);

    if (!set) {
      set = new Set();
      this._handlers.set(event, set);
    }

    set.add(handler);

    return () => set.delete(handler);
  }

  public emit(event: string, ...args: unknown[]): void {
    for (const handler of this._handlers.get(event) ?? []) {
      handler(...args);
    }
  }

  public withholdPaintUntilLayout(): void {}

  public setNodeProp(key: string, value: unknown): boolean {
    if (this.node[key] === value) {
      return false;
    }

    this.node[key] = value;

    return true;
  }

  public emitLayoutEvent(): void {
    this.hasLayout = true;
  }
}

const asElement = (fake: FakeElement) => fake as unknown as LightningElement;

type ManagerNodeLike = { node: { getComputedLeft(): number } };

function getYoga(manager: LightningManager): YogaManager {
  return (manager as unknown as { _yogaManager: YogaManager })._yogaManager;
}

// Ground truth from the native yoga nodes: lay the row out and read each
// child's computed x. Child order is the only thing that decides it here.
async function computedOrder(manager: LightningManager, ids: number[]): Promise<number[]> {
  const yoga = getYoga(manager);

  await new Promise<void>((resolve) => {
    const handler = () => {
      yoga.off('render', handler);
      resolve();
    };

    yoga.on('render', handler);
    yoga.queueRender(1, true);
  });

  const elementMap = (yoga as unknown as { _elementMap: Map<number, ManagerNodeLike> })._elementMap;

  return [...ids]
    .map((id) => ({ id, x: elementMap.get(id)!.node.getComputedLeft() }))
    .sort((a, b) => a.x - b.x)
    .map((entry) => entry.id);
}

const CHILD_IDS = [2, 3, 4];

async function setup() {
  const manager = new LightningManager();
  await manager.init();

  const parent = new FakeElement(1);

  parent.style = { display: 'flex', flexDirection: 'row', w: 100, h: 10 };
  manager.trackElement(asElement(parent));
  manager.markFlexRoot(asElement(parent));
  manager.applyStyle(parent.id, parent.style, true);

  for (const [index, id] of CHILD_IDS.entries()) {
    const child = new FakeElement(id);

    child.parent = parent;
    child.style = { w: 10, h: 10 };
    parent.children.push(child);
    manager.trackElement(asElement(child));
    manager.applyStyle(child.id, child.style, true);
    parent.emit('childAdded', child, index);
  }

  return { manager, parent };
}

function moveChild(parent: FakeElement, fromIndex: number, toIndex: number): void {
  const [child] = parent.children.splice(fromIndex, 1);

  parent.children.splice(toIndex, 0, child!);
  parent.emit('childMoved', child, fromIndex, toIndex);
}

describe('LightningManager childMoved', () => {
  it('lays children out in the original order before any move', async () => {
    const { manager } = await setup();

    expect(await computedOrder(manager, CHILD_IDS)).toEqual([2, 3, 4]);
  });

  it('moves the first yoga child to the end (append fast path)', async () => {
    const { manager, parent } = await setup();

    moveChild(parent, 0, parent.children.length - 1);

    expect(await computedOrder(manager, CHILD_IDS)).toEqual([3, 4, 2]);
  });

  it('moves the last yoga child to the front', async () => {
    const { manager, parent } = await setup();

    moveChild(parent, 2, 0);

    expect(await computedOrder(manager, CHILD_IDS)).toEqual([4, 2, 3]);
  });

  it('moves a middle yoga child forward by one', async () => {
    const { manager, parent } = await setup();

    moveChild(parent, 1, 2);

    expect(await computedOrder(manager, CHILD_IDS)).toEqual([2, 4, 3]);
  });
});

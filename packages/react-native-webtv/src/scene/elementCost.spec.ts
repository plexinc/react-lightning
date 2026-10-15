// Mount/update/layout/destroy cost and retained heap per element, stock vs SceneElement, on the
// WebGL-free compat stage. Off by default: ELEMENT_COST=1 pnpm exec vitest run elementCost
import { writeFileSync } from 'node:fs';
import { Session } from 'node:inspector/promises';
import { getHeapSnapshot } from 'node:v8';

import type { RendererMain } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';
import { describe, it } from 'vitest';

import {
  createLightningElement,
  type LightningElement,
  LightningElementType,
  LightningViewElement,
  type Plugin,
} from '@plextv/react-lightning';
import { plugin as cssTransformPlugin } from '@plextv/react-lightning-plugin-css-transform';

import { sceneElementFactory } from './sceneElementFactory';
import { createTestRenderer } from './testRenderer';

type Create = (
  type: LightningElementType,
  props: Record<string, unknown>,
  renderer: RendererMain,
  plugins: Plugin<LightningElement>[],
) => LightningElement;

const impls: [string, Create][] = [
  ['stock', (t, p, r, pl) => createLightningElement(t, p as never, r, pl, {} as Fiber)],
  ['direct', (t, p, r, pl) => sceneElementFactory.createElement(t, p as never, r, pl, {} as Fiber)],
];

const TILES = 300;
const noop = () => {};

function mountTiles(create: Create, renderer: RendererMain, plugins: Plugin<LightningElement>[]) {
  const root = create(
    LightningElementType.View,
    { style: { w: 1920, h: 1080, clipping: true } },
    renderer,
    plugins,
  );
  const all: LightningElement[] = [root];

  root.setLightningNode(renderer.root as never);

  for (let i = 0; i < TILES; i++) {
    const tile = create(
      LightningElementType.View,
      {
        style: {
          width: 200,
          height: 300,
          borderRadius: 8,
          backgroundColor: '#202020',
          transform: [{ scale: 1 }],
        },
        onFocus: noop,
        onBlur: noop,
        onLayout: noop,
        testID: `tile-${i}`,
      },
      renderer,
      plugins,
    );
    const wrap = create(
      LightningElementType.View,
      { style: { flexDirection: 'column', padding: 4 } },
      renderer,
      plugins,
    );
    const image = create(
      LightningElementType.Image,
      { src: `https://img/${i}.jpg`, style: { width: 200, height: 260 } },
      renderer,
      plugins,
    );
    const text = create(
      LightningElementType.Text,
      {
        text: `Title ${i}`,
        style: { fontSize: 22, fontFamily: 'Inter', color: 'rgba(255,255,255,0.8)', maxLines: 1 },
      },
      renderer,
      plugins,
    );

    wrap.insertChild(image);
    wrap.insertChild(text);
    tile.insertChild(wrap);
    root.insertChild(tile);
    all.push(tile, wrap, image, text);
  }

  return all;
}

const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
  }
};

function countHeapNodes(): Promise<number> {
  return new Promise((resolve) => {
    const stream = getHeapSnapshot();
    let text = '';

    stream.on('data', (chunk: Buffer) => {
      if (text.length < 4096) {
        text += chunk.toString();
      }
    });
    stream.on('end', () => resolve(Number(/"node_count":(\d+)/.exec(text)?.[1] ?? 0)));
  });
}

const gc = (globalThis as { gc?: () => void }).gc;

describe.skipIf(!process.env.ELEMENT_COST)('element cost', () => {
  it('measures', { timeout: 600_000 }, async () => {
    const rows: Record<string, Record<string, number>> = {};

    for (const flatten of [true]) {
      LightningViewElement.flattenLayoutViewsEnabled = flatten;
      LightningViewElement.roundedClippingEnabled = true;
      sceneElementFactory.configure?.({ flattenLayoutViews: flatten, roundedClipping: true });

      for (const [name, create] of impls) {
        const profileOut = process.env.ELEMENT_COST_PROFILE;
        const session = profileOut ? new Session() : null;

        if (session) {
          session.connect();
          await session.post('Profiler.enable');
          await session.post('Profiler.setSamplingInterval', { interval: 20 });
          await session.post('Profiler.start');
        }

        const times: Record<string, number[]> = { mount: [], restyle: [], layout: [], destroy: [] };

        for (let round = 0; round < 12; round++) {
          const renderer = createTestRenderer();
          const plugins = [cssTransformPlugin() as Plugin<LightningElement>];
          let t = performance.now();
          const all = mountTiles(create, renderer, plugins);

          await flush();
          times.mount.push(performance.now() - t);

          t = performance.now();

          for (let i = 1; i < all.length; i += 4) {
            all[i].setProps({
              style: {
                width: 200,
                height: 300,
                borderRadius: 8,
                backgroundColor: '#303030',
                transform: [{ scale: 1.1 }],
              },
            } as never);
          }

          await flush();
          times.restyle.push(performance.now() - t);

          t = performance.now();

          for (let k = 0; k < 4; k++) {
            for (let i = 1; i < all.length; i++) {
              const el = all[i];

              el.setNodeProp('x', (i % 7) * 10 + k);
              el.setNodeProp('y', (i % 5) * 10 + k);
              el.setNodeProp('w', 100 + k);
              el.setNodeProp('h', 50 + k);
              el.emitLayoutEvent();
            }
          }

          times.layout.push(performance.now() - t);

          t = performance.now();
          all[0].destroy();
          times.destroy.push(performance.now() - t);
        }

        if (session) {
          const { profile } = await session.post('Profiler.stop');

          writeFileSync(`${profileOut}-${name}.cpuprofile`, JSON.stringify(profile));
          session.disconnect();
        }

        const median = (xs: number[]) =>
          [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;
        const row: Record<string, number> = {};

        for (const [phase, xs] of Object.entries(times)) {
          row[`${phase} us/el`] = (median(xs.slice(2)) * 1000) / (TILES * 4);
        }

        gc?.();
        const heap0 = process.memoryUsage().heapUsed;
        const nodes0 = gc ? await countHeapNodes() : 0;
        const renderer = createTestRenderer();
        const keep = mountTiles(create, renderer, [
          cssTransformPlugin() as Plugin<LightningElement>,
        ]);

        await flush();
        gc?.();
        const heap1 = process.memoryUsage().heapUsed;
        const nodes1 = gc ? await countHeapNodes() : 0;

        row['retained bytes/el'] = (heap1 - heap0) / keep.length;
        row['heap objects/el'] = (nodes1 - nodes0) / keep.length;
        keep[0].destroy();
        rows[`${name}${flatten ? ' (flatten)' : ''}`] = row;
      }
    }

    if (process.env.ELEMENT_COST_OUT) {
      writeFileSync(process.env.ELEMENT_COST_OUT, JSON.stringify(rows, null, 2));
    }

    console.table(rows);
  });
});

import type { ReactNode } from 'react';
import createReconciler from 'react-reconciler';

import { Stage, type StageOptions } from '../Stage';
import { type Container, createHostConfig } from './hostConfig';

export type Root = {
  stage: Stage;
  render(element: ReactNode, callback?: () => void): void;
  unmount(): void;
};

let reconciler: ReturnType<
  typeof createReconciler<
    string,
    Record<string, unknown>,
    Container,
    never,
    never,
    null,
    null,
    null,
    never,
    Container,
    unknown,
    unknown,
    unknown,
    unknown
  >
> | null = null;

export function createRoot(canvas: HTMLCanvasElement, opts?: StageOptions): Root {
  const stage = new Stage(canvas, opts);

  reconciler ??= createReconciler(createHostConfig() as never);

  const r = reconciler;
  const container = r.createContainer(
    { stage },
    1,
    null,
    false,
    null,
    '',
    (e: unknown) => console.error(e),
    (e: unknown) => console.error(e),
    (e: unknown) => console.error(e),
    () => {},
  );

  return {
    stage,
    render(element, callback) {
      r.updateContainer(element, container, null, callback);
    },
    unmount() {
      r.updateContainer(null, container, null, () => {});
    },
  };
}

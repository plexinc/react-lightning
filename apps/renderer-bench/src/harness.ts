export type BenchApi = {
  name: string;
  mount(): Promise<{ commitMs: number; firstFrameMs: number }>;
  info(): Record<string, number>;
};

type Probe = { frames: [number, number, number, number][] };

declare global {
  interface Window {
    __bench?: BenchApi;
    __benchReady?: boolean;
    __probe?: Probe;
    __focus?: [number, number, number][];
  }
}

export function waitForDrawingFrame(after: number): Promise<number> {
  return new Promise((resolve) => {
    const check = () => {
      const frames = window.__probe?.frames ?? [];

      for (let i = frames.length - 1; i >= 0; i--) {
        const f = frames[i];

        if (f[0] < after) {
          break;
        }

        if (f[2] > 0) {
          resolve(f[0] + f[1]);

          return;
        }
      }

      setTimeout(check, 5);
    };

    check();
  });
}

export const onFocus = (r: number, c: number) => {
  (window.__focus ??= []).push([performance.now(), r, c]);
};

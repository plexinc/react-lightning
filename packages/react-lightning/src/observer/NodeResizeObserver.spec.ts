import type { RendererMain } from '@lightningjs/renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LightningElement } from '../types';
import { getNodeResizeObserver, NodeResizeObserver } from './NodeResizeObserver';

type FrameTickHandler = () => void;

interface MockRenderer {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  tick(): void;
  handlerCount(): number;
}

function createMockRenderer(): MockRenderer {
  const handlers = new Set<FrameTickHandler>();

  const renderer: MockRenderer = {
    on: vi.fn((event: string, handler: FrameTickHandler) => {
      if (event === 'frameTick') {
        handlers.add(handler);
      }
    }),
    off: vi.fn((event: string, handler: FrameTickHandler) => {
      if (event === 'frameTick') {
        handlers.delete(handler);
      }
    }),
    tick() {
      for (const handler of handlers) {
        handler();
      }
    },
    handlerCount() {
      return handlers.size;
    },
  };

  return renderer;
}

interface MockElement {
  node: { w: number; h: number };
  _emitResize: ReturnType<typeof vi.fn>;
}

function createMockElement(w = 0, h = 0): MockElement {
  return {
    node: { w, h },
    _emitResize: vi.fn(),
  };
}

function asObserverArg(el: MockElement): LightningElement {
  return el as unknown as LightningElement;
}

function asRendererArg(r: MockRenderer): RendererMain {
  return r as unknown as RendererMain;
}

describe('NodeResizeObserver', () => {
  let renderer: MockRenderer;
  let observer: NodeResizeObserver;

  beforeEach(() => {
    renderer = createMockRenderer();
    observer = new NodeResizeObserver(asRendererArg(renderer));
  });

  describe('lazy frameTick subscription', () => {
    it('does not subscribe to frameTick before any element is observed', () => {
      expect(renderer.handlerCount()).toBe(0);
      expect(renderer.on).not.toHaveBeenCalled();
    });

    it('subscribes on the first observe', () => {
      observer.observe(asObserverArg(createMockElement()));

      expect(renderer.handlerCount()).toBe(1);
      expect(renderer.on).toHaveBeenCalledWith('frameTick', expect.any(Function));
    });

    it('stays subscribed while at least one element is observed', () => {
      const a = createMockElement();
      const b = createMockElement();

      observer.observe(asObserverArg(a));
      observer.observe(asObserverArg(b));

      expect(renderer.handlerCount()).toBe(1);

      observer.unobserve(asObserverArg(a));

      expect(renderer.handlerCount()).toBe(1);
      expect(renderer.off).not.toHaveBeenCalled();
    });

    it('unsubscribes when the last observed element is removed', () => {
      const a = createMockElement();

      observer.observe(asObserverArg(a));
      observer.unobserve(asObserverArg(a));

      expect(renderer.handlerCount()).toBe(0);
      expect(renderer.off).toHaveBeenCalledWith('frameTick', expect.any(Function));
    });

    it('re-subscribes after a full unobserve/observe cycle', () => {
      const a = createMockElement();

      observer.observe(asObserverArg(a));
      observer.unobserve(asObserverArg(a));
      observer.observe(asObserverArg(a));

      expect(renderer.handlerCount()).toBe(1);
      expect(renderer.on).toHaveBeenCalledTimes(2);
    });
  });

  describe('observe / unobserve idempotency', () => {
    it('observing the same element twice does not double-register', () => {
      const a = createMockElement();

      observer.observe(asObserverArg(a));
      observer.observe(asObserverArg(a));

      expect(observer.isObserving(asObserverArg(a))).toBe(true);

      observer.unobserve(asObserverArg(a));

      expect(observer.isObserving(asObserverArg(a))).toBe(false);
      expect(renderer.handlerCount()).toBe(0);
    });

    it('unobserving an element that was never observed is a no-op', () => {
      const a = createMockElement();

      observer.unobserve(asObserverArg(a));

      expect(observer.isObserving(asObserverArg(a))).toBe(false);
      expect(renderer.off).not.toHaveBeenCalled();
    });

    it('isObserving reflects observation state', () => {
      const a = createMockElement();

      expect(observer.isObserving(asObserverArg(a))).toBe(false);

      observer.observe(asObserverArg(a));

      expect(observer.isObserving(asObserverArg(a))).toBe(true);

      observer.unobserve(asObserverArg(a));

      expect(observer.isObserving(asObserverArg(a))).toBe(false);
    });
  });

  describe('size-change emission', () => {
    it('emits on the first tick with the current dimensions', () => {
      const a = createMockElement(100, 200);

      observer.observe(asObserverArg(a));
      renderer.tick();

      expect(a._emitResize).toHaveBeenCalledTimes(1);
      expect(a._emitResize).toHaveBeenCalledWith({ w: 100, h: 200 });
    });

    it('emits the initial measurement even when dimensions are zero', () => {
      const a = createMockElement(0, 0);

      observer.observe(asObserverArg(a));
      renderer.tick();

      expect(a._emitResize).toHaveBeenCalledTimes(1);
      expect(a._emitResize).toHaveBeenCalledWith({ w: 0, h: 0 });
    });

    it('does not emit on subsequent ticks when dimensions are unchanged', () => {
      const a = createMockElement(100, 200);

      observer.observe(asObserverArg(a));
      renderer.tick();
      renderer.tick();
      renderer.tick();

      expect(a._emitResize).toHaveBeenCalledTimes(1);
    });

    it('emits when only width changes', () => {
      const a = createMockElement(100, 200);

      observer.observe(asObserverArg(a));
      renderer.tick();

      a.node.w = 150;
      renderer.tick();

      expect(a._emitResize).toHaveBeenCalledTimes(2);
      expect(a._emitResize).toHaveBeenNthCalledWith(2, { w: 150, h: 200 });
    });

    it('emits when only height changes', () => {
      const a = createMockElement(100, 200);

      observer.observe(asObserverArg(a));
      renderer.tick();

      a.node.h = 250;
      renderer.tick();

      expect(a._emitResize).toHaveBeenCalledTimes(2);
      expect(a._emitResize).toHaveBeenNthCalledWith(2, { w: 100, h: 250 });
    });

    it('emits when both dimensions change', () => {
      const a = createMockElement(100, 200);

      observer.observe(asObserverArg(a));
      renderer.tick();

      a.node.w = 150;
      a.node.h = 250;
      renderer.tick();

      expect(a._emitResize).toHaveBeenCalledTimes(2);
      expect(a._emitResize).toHaveBeenNthCalledWith(2, { w: 150, h: 250 });
    });

    it('tracks per-element previous dimensions independently', () => {
      const a = createMockElement(100, 100);
      const b = createMockElement(200, 200);

      observer.observe(asObserverArg(a));
      observer.observe(asObserverArg(b));
      renderer.tick();

      a._emitResize.mockClear();
      b._emitResize.mockClear();

      a.node.w = 150;
      renderer.tick();

      expect(a._emitResize).toHaveBeenCalledTimes(1);
      expect(b._emitResize).not.toHaveBeenCalled();
    });

    it('does not emit for an element after it is unobserved', () => {
      const a = createMockElement(100, 200);

      observer.observe(asObserverArg(a));
      renderer.tick();
      a._emitResize.mockClear();

      observer.unobserve(asObserverArg(a));

      a.node.w = 500;
      renderer.tick();

      expect(a._emitResize).not.toHaveBeenCalled();
    });

    it('resets prev dimensions when an element is re-observed after unobserve', () => {
      const a = createMockElement(100, 200);

      observer.observe(asObserverArg(a));
      renderer.tick();
      a._emitResize.mockClear();

      observer.unobserve(asObserverArg(a));
      observer.observe(asObserverArg(a));
      renderer.tick();

      expect(a._emitResize).toHaveBeenCalledTimes(1);
      expect(a._emitResize).toHaveBeenCalledWith({ w: 100, h: 200 });
    });
  });

  describe('getNodeResizeObserver', () => {
    it('returns the same instance for the same renderer', () => {
      const r = asRendererArg(createMockRenderer());

      const first = getNodeResizeObserver(r);
      const second = getNodeResizeObserver(r);

      expect(first).toBe(second);
    });

    it('returns different instances for different renderers', () => {
      const r1 = asRendererArg(createMockRenderer());
      const r2 = asRendererArg(createMockRenderer());

      const first = getNodeResizeObserver(r1);
      const second = getNodeResizeObserver(r2);

      expect(first).not.toBe(second);
    });
  });
});

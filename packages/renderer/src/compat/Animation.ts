import { EventEmitter } from './EventEmitter';
import { normalizeProp } from './Shaders';
import { type TimingFunction, getTimingFunction, mergeColorProgress } from './timing';

export type AnimationSettings = {
  duration?: number;
  delay?: number;
  easing?: string | TimingFunction;
  loop?: boolean;
  repeat?: number;
  repeatDelay?: number;
  stopMethod?: 'reverse' | 'reset' | false;
};

type Target = Record<string, unknown>;

type Group = {
  keys: string[];
  start: number[];
  target: number[];
  isColor: boolean[];
};

export interface AnimatableNode {
  destroyed: boolean;
  shader: { props: Target } | null;
}

/**
 * Lightning's CoreAnimation and CoreAnimationController in one object: start
 * values are read when the animation is created, `stop()` resets by default,
 * `'stopped'` fires when it finishes or is stopped.
 */
export class Animation extends EventEmitter {
  public state: 'scheduled' | 'running' | 'paused' | 'stopped' = 'stopped';
  public progress = 0;

  private readonly _node: AnimatableNode & Target;
  private readonly _manager: AnimationManager;
  private readonly _props: Group | null;
  private readonly _shaderProps: Group | null;
  private readonly _duration: number;
  private readonly _delay: number;
  private _delayFor: number;
  private _loop: boolean;
  private _stopMethod: 'reverse' | 'reset' | false;
  private readonly _timing: TimingFunction;
  private _stoppedPromise: Promise<void> = Promise.resolve();
  private _stoppedResolve: (() => void) | null = null;

  public constructor(
    node: AnimatableNode & Target,
    props: Target,
    settings: AnimationSettings,
    manager: AnimationManager,
  ) {
    super();
    this._node = node;
    this._manager = manager;

    let group: Group | null = null;
    let shaderGroup: Group | null = null;

    for (const key in props) {
      if (key === 'shaderProps') {
        const sp = props.shaderProps as Target | undefined;

        if (!sp || !node.shader) {
          continue;
        }

        shaderGroup = { keys: [], start: [], target: [], isColor: [] };

        for (const sk in sp) {
          let start = normalizeProp(sk, node.shader.props[sk]) as number | number[];

          if (Array.isArray(start)) {
            start = start[0];
          }

          const raw = normalizeProp(sk, sp[sk]);
          const target = Array.isArray(raw) ? (raw as number[])[0] : (raw as number);

          shaderGroup.keys.push(sk);
          shaderGroup.start.push(Number(start) || 0);
          shaderGroup.target.push(Number(target) || 0);
          shaderGroup.isColor.push(sk.toLowerCase().includes('color'));
        }

        continue;
      }

      group ??= { keys: [], start: [], target: [], isColor: [] };
      group.keys.push(key);
      group.start.push(Number(node[key]) || 0);
      group.target.push(Number(props[key]) || 0);
      group.isColor.push(key.indexOf('color') !== -1 || key.indexOf('Color') !== -1);
    }

    this._props = group;
    this._shaderProps = shaderGroup;
    this._duration = settings.duration ?? 0;
    this._delay = settings.delay ?? 0;
    this._delayFor = this._delay;
    this._loop = settings.loop ?? false;
    this._stopMethod = settings.stopMethod ?? false;

    const easing = settings.easing ?? 'linear';

    this._timing = typeof easing === 'string' ? getTimingFunction(easing) : easing;
  }

  public start(): this {
    if (this.state !== 'running' && this.state !== 'scheduled') {
      if (this._stoppedResolve === null) {
        this._stoppedPromise = new Promise((r) => {
          this._stoppedResolve = r;
        });
      }

      this.state = 'scheduled';
      this._manager.add(this);
    }

    return this;
  }

  public stop(reset = true): this {
    this._manager.remove(this);

    if (this._stoppedResolve !== null) {
      this._stoppedResolve();
      this._stoppedResolve = null;
      this.emit('stopped', this);
    }

    if (reset) {
      this.progress = 0;
      this._delayFor = this._delay;
      this._apply();
    }

    this.state = 'stopped';

    return this;
  }

  public pause(): this {
    this._manager.remove(this);
    this.state = 'paused';

    return this;
  }

  public restore(): this {
    this._stoppedResolve = null;
    this.progress = 0;
    this._delayFor = this._delay;

    const g = this._props;

    if (g) {
      for (let i = 0; i < g.keys.length; i++) {
        this._node[g.keys[i]] = g.start[i];
      }
    }

    const sg = this._shaderProps;

    if (sg && this._node.shader) {
      for (let i = 0; i < sg.keys.length; i++) {
        this._node.shader.props[sg.keys[i]] = sg.start[i];
      }
    }

    return this;
  }

  public waitUntilStopped(): Promise<void> {
    return this._stoppedPromise;
  }

  /** Returns false once the animation is done and should leave the manager. */
  public update(dt: number): boolean {
    if (this._node.destroyed) {
      this.state = 'stopped';

      return false;
    }

    const duration = this._duration;

    if (this._delayFor > 0) {
      this._delayFor -= dt;

      if (this._delayFor >= 0) {
        return true;
      }

      dt = -this._delayFor;
      this._delayFor = 0;
    }

    if (duration === 0) {
      this.progress = 1;
      this._apply();
      this._finish();

      return false;
    }

    if (this.progress === 0) {
      this.state = 'running';
      this.emit('animating', this);
    }

    this.progress += dt / duration;

    if (this.progress > 1) {
      if (this._loop) {
        this.progress = 0;
        this._delayFor = this._delay;
      } else {
        this.progress = 1;
      }
    }

    this._apply();

    if (this.progress < 1) {
      if (this.eventListeners.tick) {
        this.emit('tick', { progress: this.progress });
      }

      return true;
    }

    if (this._stopMethod === 'reverse') {
      this._reverse();

      return true;
    }

    this._finish();

    return false;
  }

  private _finish(): void {
    if (this._stoppedResolve !== null) {
      this._stoppedResolve();
      this._stoppedResolve = null;
    }

    this.state = 'stopped';
    this.emit('stopped', this);
  }

  private _reverse(): void {
    this.progress = 0;

    for (const g of [this._props, this._shaderProps]) {
      if (!g) {
        continue;
      }

      const s = g.start;

      g.start = g.target;
      g.target = s;
    }

    if (!this._loop) {
      this._stopMethod = false;
    }
  }

  private _apply(): void {
    const p = this.progress;
    const e = p === 0 ? 0 : p === 1 ? 1 : this._timing(p);
    const g = this._props;

    if (g) {
      for (let i = 0; i < g.keys.length; i++) {
        this._node[g.keys[i]] = value(g.isColor[i], g.start[i], g.target[i], e, p);
      }
    }

    const sg = this._shaderProps;

    if (sg && this._node.shader) {
      const props = this._node.shader.props;

      for (let i = 0; i < sg.keys.length; i++) {
        props[sg.keys[i]] = value(sg.isColor[i], sg.start[i], sg.target[i], e, p);
      }
    }
  }
}

function value(isColor: boolean, start: number, target: number, e: number, p: number): number {
  if (p === 1) {
    return target;
  }

  if (p === 0) {
    return start;
  }

  if (isColor) {
    return start === target ? start : mergeColorProgress(start, target, e);
  }

  return start + (target - start) * e;
}

export class AnimationManager {
  public readonly active = new Set<Animation>();
  private readonly _onActive: () => void;

  public constructor(onActive: () => void) {
    this._onActive = onActive;
  }

  public add(anim: Animation): void {
    this.active.add(anim);
    this._onActive();
  }

  public remove(anim: Animation): void {
    this.active.delete(anim);
  }

  public update(dt: number): void {
    if (this.active.size === 0) {
      return;
    }

    for (const anim of Array.from(this.active)) {
      if (!anim.update(dt)) {
        this.active.delete(anim);
      }
    }
  }
}

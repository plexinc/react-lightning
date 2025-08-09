import type { BaseAnimationBuilder } from 'react-native-reanimated-original';
import type { Constructor } from 'type-fest';

/**
 * Creates a wrapper around a BaseAnimationBuilder class to customize its build behavior.
 * @param OriginalClass The original BaseAnimationBuilder class to wrap.
 * @param buildFn A function that defines the custom build behavior.
 * @returns A new class that extends the original class with the custom build behavior.
 */
export function createBuilderWrapper<
  T extends BaseAnimationBuilder,
  TClass extends Constructor<T>,
>(
  OriginalClass: TClass,
  buildFn: (this: T, originalBuildFn: T['build']) => ReturnType<T['build']>,
) {
  class LightningAnimationBuilder extends (OriginalClass as Constructor<BaseAnimationBuilder>) {
    private _buildFn: T['build'];

    // Override the static createInstance method to return an instance of this wrapper class
    static createInstance() {
      return new LightningAnimationBuilder();
    }

    constructor() {
      super();

      this._buildFn = this.build.bind(this);

      // Override the build method to add custom behavior
      this.build = () => buildFn.call(this as unknown as T, this._buildFn);
    }
  }

  return LightningAnimationBuilder as unknown as TClass;
}

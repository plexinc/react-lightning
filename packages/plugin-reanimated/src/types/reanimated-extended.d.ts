declare module 'react-native-reanimated-original' {
  import type {
    WithSpringConfig as BaseSpringConfig,
    WithTimingConfig as BaseTimingConfig,
  } from 'react-native-reanimated';

  export type WithTimingConfig = BaseTimingConfig & {
    delay?: number;
  };

  export type WithSpringConfig = BaseSpringConfig & {
    delay?: number;
  };
}

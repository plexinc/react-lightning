import type {
  WithSpringConfig as BaseSpringConfig,
  WithTimingConfig as BaseTimingConfig,
} from 'react-native-reanimated';

declare module 'react-native-reanimated' {
  interface WithTimingConfig extends BaseTimingConfig {
    delay?: number;
  }

  interface WithSpringConfig extends BaseSpringConfig {
    delay?: number;
  }
}

export type {
  WithSpringConfig as SpringConfig,
  WithTimingConfig as TimingConfig,
} from 'react-native-reanimated';

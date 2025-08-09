import {
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  SlideInUp,
  SlideOutDown,
  SlideOutLeft,
  SlideOutRight,
  SlideOutUp,
} from '@plextv/react-lightning-plugin-reanimated';
import { Column } from '@plextv/react-native-lightning-components';
import type { Meta } from '@storybook/react';
import { AnimationSampler } from './AnimationSampler';

export default {
  title: 'Plugins/@plextv∕react-lightning-plugin-reanimated/Slide',
  tags: ['reactNative'],
} as Meta;

// The rest of the story definitions
export const Slide = () => {
  return (
    <Column style={{ gap: 15 }}>
      <AnimationSampler
        buttonPrefix="Slide"
        buttonSuffix="Up"
        entering={SlideInUp.duration(1000)}
        exiting={SlideOutUp.duration(1000)}
      />

      <AnimationSampler
        buttonPrefix="Slide"
        buttonSuffix="Right"
        entering={SlideInRight.duration(1000)}
        exiting={SlideOutRight.duration(1000)}
      />

      <AnimationSampler
        buttonPrefix="Slide"
        buttonSuffix="Down"
        entering={SlideInDown.duration(1000)}
        exiting={SlideOutDown.duration(1000)}
      />

      <AnimationSampler
        buttonPrefix="Slide"
        buttonSuffix="Left"
        entering={SlideInLeft.duration(1000)}
        exiting={SlideOutLeft.duration(1000)}
      />
    </Column>
  );
};

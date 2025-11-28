import { Column } from '@plextv/react-native-lightning-components';
import type { Meta } from '@storybook/react-vite';
import {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutLeft,
  FadeOutRight,
  FadeOutUp,
} from 'react-native-reanimated';
import { AnimationSampler } from './AnimationSampler';

export default {
  title: 'Plugins/react-lightning-plugin-reanimated/Fade',
  tags: ['reactNative'],
} as Meta;

// The rest of the story definitions
export const Fade = () => {
  return (
    <Column style={{ gap: 15 }}>
      <AnimationSampler
        buttonPrefix="Fade"
        entering={FadeIn.duration(1000)}
        exiting={FadeOut.duration(1000)}
      />

      <AnimationSampler
        buttonPrefix="Fade"
        buttonSuffix="Up"
        entering={FadeInUp.duration(1000)}
        exiting={FadeOutUp.duration(1000)}
      />

      <AnimationSampler
        buttonPrefix="Fade"
        buttonSuffix="Right"
        entering={FadeInRight.duration(1000)}
        exiting={FadeOutRight.duration(1000)}
      />

      <AnimationSampler
        buttonPrefix="Fade"
        buttonSuffix="Down"
        entering={FadeInDown.duration(1000)}
        exiting={FadeOutDown.duration(1000)}
      />

      <AnimationSampler
        buttonPrefix="Fade"
        buttonSuffix="Left"
        entering={FadeInLeft.duration(1000)}
        exiting={FadeOutLeft.duration(1000)}
      />
    </Column>
  );
};

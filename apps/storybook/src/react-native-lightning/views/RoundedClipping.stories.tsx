import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

/**
 * Fixtures for rounded clipping (borderRadius + overflow hidden).
 *
 * Lightning's `clipping` is a rectangular scissor, so children used to bleed
 * square corners over the parent's rounding. The stencil clipRadius path clips
 * them to the rounded rect instead. Every fixture is a visual pass/fail.
 */

const RADIUS = 28;

const Fixture = ({ overflowHidden }: { overflowHidden: boolean }) => (
  <View style={{ padding: 40, flexDirection: 'row', gap: 32 }}>
    <View
      style={{
        width: 420,
        height: 260,
        borderRadius: RADIUS,
        overflow: overflowHidden ? 'hidden' : 'visible',
        backgroundColor: '#1c1f26',
      }}
    >
      {/* Full-bleed child; its square corners would cover the parent's rounding. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#ff9f0a',
        }}
      />
      {/* Bottom strip crossing both bottom corners (the progress-bar case). */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 44,
          backgroundColor: '#34c759',
        }}
      />
      <Text style={{ color: '#000', fontSize: 20, margin: 20 }}>
        {overflowHidden
          ? 'all four corners must be rounded'
          : 'control: no overflow hidden, corners stay square'}
      </Text>
    </View>
  </View>
);

// borderRadius far past the node size (the borderRadius: 9999 circle idiom).
// The renderer must clamp the clip radius to half the node size; unclamped it
// breaks the rounded-rect SDF and clips the whole subtree away.
const MaxRadiusFixture = () => (
  <View style={{ padding: 40, flexDirection: 'row', gap: 32, alignItems: 'center' }}>
    <View
      style={{
        width: 140,
        height: 140,
        borderRadius: 9999,
        overflow: 'hidden',
        backgroundColor: '#1c1f26',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#ff375f',
        }}
      />
      <Text style={{ color: '#fff', fontSize: 18, margin: 52 }}>R</Text>
    </View>
    <View
      style={{
        width: 260,
        height: 72,
        borderRadius: 9999,
        overflow: 'hidden',
        backgroundColor: '#0a84ff',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 24,
          backgroundColor: '#34c759',
        }}
      />
      <Text style={{ color: '#fff', fontSize: 20, marginTop: 16, marginLeft: 32 }}>
        circle + pill, nothing vanishes
      </Text>
    </View>
  </View>
);

// Content that keeps changing INSIDE the clipped subtree: a block sweeping
// horizontally and a block whose opacity pulses. If either freezes, RTT
// invalidation is broken for that update kind.
const AnimatedFixture = () => {
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    let raf = 0;
    const t0 = Date.now();
    const step = () => {
      const t = ((Date.now() - t0) % 4000) / 4000;

      x.value = (t < 0.5 ? t * 2 : (1 - t) * 2) * 300;
      opacity.value = t < 0.5 ? 1 : 0.15;
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    return () => cancelAnimationFrame(raf);
  }, [x, opacity]);

  // Explicit deps: shared-value listeners attach from this array (no babel
  // plugin to infer them).
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }), [x]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }), [opacity]);

  return (
    <View style={{ padding: 40 }}>
      <View
        style={{
          width: 420,
          height: 260,
          borderRadius: RADIUS,
          overflow: 'hidden',
          backgroundColor: '#1c1f26',
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 30,
              width: 130,
              height: 90,
              backgroundColor: '#ff9f0a',
            },
            sweepStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 45,
              bottom: 24,
              width: 330,
              height: 60,
              backgroundColor: '#34c759',
            },
            pulseStyle,
          ]}
        />
      </View>
    </View>
  );
};

export default {
  title: 'react-native-lightning/Views/Rounded Clipping',
  component: Fixture,
  tags: ['reactNative'],
  parameters: { canvasOptions: { roundedClipping: true } },
} as Meta<typeof Fixture>;

type Story = StoryObj<typeof Fixture>;

export const OverflowHidden: Story = {
  args: { overflowHidden: true },
};

export const Control_NoOverflow: Story = {
  args: { overflowHidden: false },
};

export const MaxRadius: Story = {
  render: () => <MaxRadiusFixture />,
};

export const AnimatedContent: Story = {
  render: () => <AnimatedFixture />,
};

import React, { useCallback } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

function randomColor() {
  return `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`;
}

const AnimationTest = () => {
  const translateX = useSharedValue(200);
  const translateY = useSharedValue(200);
  const scale = useSharedValue(1);
  const animColor = useSharedValue(randomColor());

  const handlePress = useCallback(() => {
    translateX.value = Math.random() * 1500;
    translateY.value = Math.random() * 900;
    scale.value = Math.random() * 1.5 + 0.5;
    animColor.value = randomColor();
  }, [translateX, translateY, animColor, scale]);

  const animatedStyles = useAnimatedStyle(
    () => ({
      top: withTiming(translateY.value),
      backgroundColor: withTiming(animColor.value),
      transform: [
        {
          scale: withTiming(scale.value),
        },
        {
          translateX: withTiming(translateX.value),
        },
      ],
    }),
    [translateX, translateY, animColor],
  );

  return (
    <>
      <Animated.View
        style={[
          styles.box,
          {
            position: 'absolute',
          },
          animatedStyles,
        ]}
      />

      <View style={styles.container}>
        <Button
          onPress={handlePress}
          color={animColor.value}
          title="Click me"
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    height: 120,
    width: 120,
    borderRadius: 20,
    marginVertical: 50,
  },
});

export { AnimationTest };

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface Props {
  text: string;
  x: number;
  y: number;
  color: string;
  bg: string;
  big?: boolean;
  onDone?: () => void;
}

export const FloatScore: React.FC<Props> = ({ text, x, y, color, bg, big, onDone }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withTiming(1, { duration: 400 }),
      withTiming(0, { duration: 320 })
    );
    scale.value = withSequence(
      withTiming(1.15, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 200 })
    );
    translateY.value = withTiming(-70, { duration: 900, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done && onDone) runOnJS(onDone)();
    });
  }, [opacity, scale, translateY, onDone]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: -50 }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.host, { left: x, top: y }, animStyle]}>
      <View style={[styles.shadow, { backgroundColor: bg }]} />
      <Text
        style={[
          styles.text,
          { color, fontSize: big ? 48 : 22 },
        ]}
        allowFontScaling={false}
      >
        {text}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 50,
  },
  text: {
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  shadow: {
    position: 'absolute',
    inset: -8,
    borderRadius: 12,
    opacity: 0.4,
  } as any,
});

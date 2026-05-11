import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface Props {
  big: string;
  small: string;
  color: string;
  onDone?: () => void;
}

export const ComboCallout: React.FC<Props> = ({ big, small, color, onDone }) => {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(-4);
  const translateY = useSharedValue(0);

  // Keep latest onDone in a ref so the animation effect can stay mount-only.
  // Otherwise frequent parent re-renders restart the sequence and the
  // overlay never finishes hiding itself.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.15, { duration: 180, easing: Easing.out(Easing.back(1.6)) }),
      withTiming(1, { duration: 220 }),
      withDelay(380, withTiming(0.9, { duration: 200 }))
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 160 }),
      withDelay(580, withTiming(0, { duration: 220 }))
    );
    rotate.value = withSequence(
      withTiming(2, { duration: 180 }),
      withTiming(0, { duration: 220 })
    );
    translateY.value = withDelay(
      600,
      withTiming(-30, { duration: 220 }, (done) => {
        if (done) {
          const cb = onDoneRef.current;
          if (cb) runOnJS(cb)();
        }
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -120 },
      { translateY: -40 + translateY.value },
      { scale: scale.value },
      { rotate: rotate.value + 'deg' },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.host, animStyle]}>
      <Text style={[styles.big, { color }]} allowFontScaling={false}>
        {big}
      </Text>
      <Text style={[styles.small, { color }]} allowFontScaling={false}>
        {small}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: '50%',
    top: '40%',
    width: 240,
    pointerEvents: 'none',
    zIndex: 100,
    alignItems: 'center',
  },
  big: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 52,
    textAlign: 'center',
  },
  small: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
    textAlign: 'center',
  },
});

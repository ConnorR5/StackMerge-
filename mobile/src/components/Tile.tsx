import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  Easing,
  withRepeat,
} from 'react-native-reanimated';
import { colorFor, isLightTile, SPECIAL_BOMB, SPECIAL_WILD, tileText, type TileValue } from '../constants';
import type { Theme } from '../theme';

interface Props {
  value: TileValue;
  theme: Theme;
  /** Increments when this cell merged (for the merge pulse animation). */
  mergePulseKey?: number;
  /** Increments when this cell is freshly placed (for the spawn pop). */
  spawnKey?: number;
}

export const Tile: React.FC<Props> = React.memo(({ value, theme, mergePulseKey, spawnKey }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const wildPulse = useSharedValue(1);
  const bombPulse = useSharedValue(1);
  const lastMerge = useRef<number | undefined>(undefined);
  const lastSpawn = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Spawn pop only on fresh placement
    if (spawnKey !== undefined && spawnKey !== lastSpawn.current) {
      lastSpawn.current = spawnKey;
      scale.value = 0.3;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 10, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 180 });
    }
  }, [spawnKey, scale, opacity]);

  useEffect(() => {
    if (mergePulseKey !== undefined && mergePulseKey !== lastMerge.current) {
      lastMerge.current = mergePulseKey;
      scale.value = withSequence(
        withTiming(1.1, { duration: 70, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 14, stiffness: 320 })
      );
    }
  }, [mergePulseKey, scale]);

  useEffect(() => {
    if (value === SPECIAL_WILD) {
      wildPulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
    } else if (value === SPECIAL_BOMB) {
      bombPulse.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 450, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 450, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
    }
  }, [value, wildPulse, bombPulse]);

  const animStyle = useAnimatedStyle(() => {
    const extraScale =
      value === SPECIAL_WILD ? wildPulse.value : value === SPECIAL_BOMB ? bombPulse.value : 1;
    return {
      transform: [{ scale: scale.value * extraScale }],
      opacity: opacity.value,
    };
  });

  const fg = isLightTile(value) ? theme.ink : '#fff';
  const bg = colorFor(value);

  // Drop shadow + special glow for wild
  const wildShadow = value === SPECIAL_WILD ? styles.wildShadow : null;

  return (
    <Animated.View style={[styles.tile, { backgroundColor: bg }, wildShadow, animStyle]}>
      <Text style={[styles.label, { color: fg, fontSize: tileFontSize(value) }]} allowFontScaling={false}>
        {tileText(value)}
      </Text>
    </Animated.View>
  );
});

function tileFontSize(v: TileValue): number {
  if (v === SPECIAL_WILD || v === SPECIAL_BOMB) return 28;
  if (v < 100) return 28;
  if (v < 1000) return 24;
  if (v < 10000) return 20;
  return 16;
}

const styles = StyleSheet.create({
  tile: {
    width: '88%',
    height: '88%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 0,
    elevation: 2,
  },
  wildShadow: {
    shadowColor: '#f4c542',
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});

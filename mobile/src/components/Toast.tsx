import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import type { Theme } from '../theme';

interface ToastSpec {
  id: number;
  mark: string;
  label: string;
  name: string;
}

let listeners: Array<(t: ToastSpec) => void> = [];
let nextId = 1;

export function showToast(mark: string, label: string, name: string) {
  const t = { id: nextId++, mark, label, name };
  listeners.forEach((l) => l(t));
}

export const ToastLayer: React.FC<{ theme: Theme }> = ({ theme }) => {
  const [items, setItems] = React.useState<ToastSpec[]>([]);

  useEffect(() => {
    const fn = (t: ToastSpec) => setItems((p) => [...p, t]);
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }, []);

  const remove = (id: number) => setItems((p) => p.filter((t) => t.id !== id));

  return (
    <SafeAreaView style={styles.host} pointerEvents="none" edges={['top']}>
      {items.map((t, i) => (
        <ToastItem key={t.id} spec={t} theme={theme} onDone={() => remove(t.id)} index={i} />
      ))}
    </SafeAreaView>
  );
};

const ToastItem: React.FC<{
  spec: ToastSpec;
  theme: Theme;
  onDone: () => void;
  index: number;
}> = ({ spec, theme, onDone, index }) => {
  const ty = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    ty.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.back(1.5)) });
    opacity.value = withTiming(1, { duration: 200 });
    ty.value = withSequence(
      withTiming(0, { duration: 320, easing: Easing.out(Easing.back(1.5)) }),
      withDelay(2200, withTiming(-140, { duration: 280 }, (done) => {
        if (done) runOnJS(onDone)();
      }))
    );
  }, [ty, opacity, onDone]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value + index * 56 }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: theme.ink, borderColor: theme.ink },
        animStyle,
      ]}
    >
      <Text style={[styles.mark, { color: theme.bg }]} allowFontScaling={false}>
        {spec.mark}
      </Text>
      <View>
        <Text style={[styles.label, { color: theme.accent }]} allowFontScaling={false}>
          {spec.label}
        </Text>
        <Text style={[styles.name, { color: theme.bg }]} allowFontScaling={false}>
          {spec.name}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    gap: 10,
    alignItems: 'center',
    maxWidth: 360,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  mark: {
    fontSize: 22,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  name: {
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: -0.3,
    marginTop: 2,
  },
});

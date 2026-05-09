/**
 * Particle bursts on merges. Implemented as plain Animated.View squares —
 * lightweight, works on iOS/Android/web with no extra deps.
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface Burst {
  id: number;
  x: number;
  y: number;
  color: string;
  count: number;
  speed: number;
  life: number;
}

let nextId = 1;
let listeners: Array<(b: Burst) => void> = [];

export function emitBurst(x: number, y: number, color: string, count = 12, speed = 4, life = 0.7) {
  const b: Burst = { id: nextId++, x, y, color, count, speed, life };
  listeners.forEach((l) => l(b));
}

interface ParticleProps {
  startX: number;
  startY: number;
  color: string;
  angle: number;
  speed: number;
  life: number;
  onDone: () => void;
  size: number;
}

const Particle: React.FC<ParticleProps> = ({
  startX,
  startY,
  color,
  angle,
  speed,
  life,
  onDone,
  size,
}) => {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const dx = Math.cos(angle) * speed * 60;
    const dy = Math.sin(angle) * speed * 60 + 80; // gravity baked in (positive y = down)
    tx.value = withTiming(dx, { duration: life * 1000, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(dy, { duration: life * 1000, easing: Easing.in(Easing.quad) });
    opacity.value = withTiming(0, { duration: life * 1000 }, (done) => {
      if (done) runOnJS(onDone)();
    });
  }, [angle, speed, life, tx, ty, opacity, onDone]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: startX - size / 2,
          top: startY - size / 2,
          width: size,
          height: size,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

export const ParticleLayer: React.FC = () => {
  const [bursts, setBursts] = React.useState<Burst[]>([]);

  useEffect(() => {
    const fn = (b: Burst) => setBursts((prev) => [...prev, b]);
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }, []);

  const removeBurst = (id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <>
      {bursts.map((b) => (
        <BurstHost key={b.id} burst={b} onDone={() => removeBurst(b.id)} />
      ))}
    </>
  );
};

const BurstHost: React.FC<{ burst: Burst; onDone: () => void }> = ({ burst, onDone }) => {
  const [doneCount, setDoneCount] = React.useState(0);
  React.useEffect(() => {
    if (doneCount >= burst.count) onDone();
  }, [doneCount, burst.count, onDone]);
  const items = [];
  for (let i = 0; i < burst.count; i++) {
    const angle = (Math.PI * 2 * i) / burst.count + Math.random() * 0.4 - Math.PI / 2;
    const speed = burst.speed * (0.6 + Math.random() * 0.7);
    const size = 4 + Math.random() * 4;
    items.push(
      <Particle
        key={i}
        startX={burst.x}
        startY={burst.y}
        color={burst.color}
        angle={angle}
        speed={speed}
        life={burst.life}
        size={size}
        onDone={() => setDoneCount((n) => n + 1)}
      />
    );
  }
  return <>{items}</>;
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    borderRadius: 2,
  },
});

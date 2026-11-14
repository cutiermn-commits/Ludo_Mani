import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

interface Props {
  value: number | null;
  color: string;
  enabled: boolean;
  onPress: () => void;
  size?: number;
  /** Changes whenever a new roll happens; triggers the tumble animation. */
  rollKey?: string | null;
}

const TUMBLE_MS = 450;
const FRAME_MS = 60;

export function Dice({ value, color, enabled, onPress, size = 72, rollKey }: Props) {
  // Tumble: show random faces and spin briefly before settling on the real value.
  const [face, setFace] = useState<number | null>(null);
  const spin = useRef(new Animated.Value(0)).current;
  const lastKey = useRef(rollKey);
  useEffect(() => {
    if (!rollKey || rollKey === lastKey.current) return;
    lastKey.current = rollKey;
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: TUMBLE_MS, useNativeDriver: true }).start();
    const t = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), FRAME_MS);
    const done = setTimeout(() => {
      clearInterval(t);
      setFace(null);
    }, TUMBLE_MS);
    return () => {
      clearInterval(t);
      clearTimeout(done);
      setFace(null);
    };
  }, [rollKey, spin]);
  const shown = face ?? value;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  const pip = size * 0.16;
  const step = (size - pip) / 2 - size * 0.12;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={enabled ? 'Roll dice' : value ? `Dice shows ${value}` : 'Dice'}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.die,
        { width: size, height: size, borderColor: color, opacity: enabled || value ? 1 : 0.6, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
      {!shown && enabled && (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.roll, { fontSize: size * 0.22 }]}>ROLL</Text>
        </View>
      )}
      {(PIPS[shown ?? 0] ?? []).map(([gx, gy], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: pip,
            height: pip,
            borderRadius: pip / 2,
            backgroundColor: '#1A1A1A',
            left: size * 0.12 + gx * step - 1.5,
            top: size * 0.12 + gy * step - 1.5,
          }}
        />
      ))}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roll: { fontWeight: '900', color: '#1A1A1A', textAlign: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  die: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});

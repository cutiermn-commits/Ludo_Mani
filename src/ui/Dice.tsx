import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
}

export function Dice({ value, color, enabled, onPress, size = 72 }: Props) {
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
      {!value && enabled && <Text style={[styles.roll, { fontSize: size * 0.22 }]}>ROLL</Text>}
      {(PIPS[value ?? 0] ?? []).map(([gx, gy], i) => (
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roll: { fontWeight: '900', color: '#1A1A1A', textAlign: 'center' },
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

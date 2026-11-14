import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UI } from './theme';

/** Shows a name with a 🎲 button that shuffles it to another fun name. */
export function NameChip({ label, name, onShuffle, color }: { label?: string; name: string | null; onShuffle?: () => void; color?: string }) {
  return (
    <View style={styles.row}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Name'}: ${name ?? ''}${onShuffle ? '. Tap for a new name.' : ''}`}
        disabled={!onShuffle}
        onPress={onShuffle}
        style={({ pressed }) => [styles.chip, color ? { borderColor: color } : null, { opacity: pressed ? 0.75 : 1 }]}
      >
        <Text style={styles.name} numberOfLines={1}>
          {name ?? '…'}
        </Text>
        {onShuffle ? <Text style={styles.dice}>🎲</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  label: { color: UI.muted, fontSize: 15 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: UI.surface,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: UI.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    maxWidth: 280,
  },
  name: { color: UI.text, fontSize: 18, fontWeight: '800', flexShrink: 1 },
  dice: { fontSize: 18 },
});

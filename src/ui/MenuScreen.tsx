import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { COLORS, Color } from '../engine/board';
import { DEFAULT_RULES, Difficulty, PlayerSetup, Rules } from '../engine/game';
import { PrivacyModal } from './PrivacyModal';
import { LABEL, PALETTE, UI } from './theme';

type Seat = 'human' | Difficulty | 'off';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export const RULE_LABELS: [keyof Rules, string][] = [
  ['captureBonus', 'Extra roll after a capture'],
  ['homeBonus', 'Extra roll when a token gets home'],
  ['tripleSixForfeit', 'Three 6s in a row ends your turn'],
];

const NEXT: Record<Seat, Seat> = { human: 'easy', easy: 'medium', medium: 'hard', hard: 'off', off: 'human' };
const SEAT_LABEL: Record<Seat, string> = {
  human: 'Player',
  easy: 'Computer · Easy',
  medium: 'Computer · Medium',
  hard: 'Computer · Hard',
  off: 'Empty',
};

interface Props {
  onStart: (players: PlayerSetup[], rules: Rules) => void;
  onOnline: () => void;
}

export function MenuScreen({ onStart, onOnline }: Props) {
  const [seats, setSeats] = useState<Record<Color, Seat>>({ red: 'human', green: 'medium', yellow: 'medium', blue: 'medium' });
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const active = COLORS.filter((c) => seats[c] !== 'off');
  const canStart = active.length >= 2;

  const toSetup = (c: Color): PlayerSetup => {
    const s = seats[c];
    return s === 'human' ? { color: c, kind: 'human' } : { color: c, kind: 'bot', difficulty: s as Difficulty };
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>LUDO</Text>

      <Pressable
        accessibilityRole="button"
        onPress={onOnline}
        style={({ pressed }) => [styles.online, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={styles.onlineText}>Play online with friends</Text>
      </Pressable>

      <Text style={styles.subtitle}>Or play on this device · tap a seat to change it</Text>

      <View style={styles.seats}>
        {COLORS.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`${LABEL[c]} seat: ${SEAT_LABEL[seats[c]]}. Tap to change.`}
            onPress={() => setSeats((s) => ({ ...s, [c]: NEXT[s[c]] }))}
            style={[styles.seat, { backgroundColor: seats[c] === 'off' ? UI.surface : PALETTE[c].main }]}
          >
            <Text style={styles.seatColor}>{LABEL[c]}</Text>
            <Text style={styles.seatKind}>{SEAT_LABEL[seats[c]]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.rules}>
        {RULE_LABELS.map(([k, label]) => (
          <View key={k} style={styles.ruleRow}>
            <Text style={styles.ruleText}>{label}</Text>
            <Switch value={rules[k]} onValueChange={(v) => setRules((r) => ({ ...r, [k]: v }))} />
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!canStart}
        onPress={() => onStart(active.map(toSetup), rules)}
        style={({ pressed }) => [styles.start, { opacity: canStart ? (pressed ? 0.8 : 1) : 0.4 }]}
      >
        <Text style={styles.startText}>{canStart ? 'Start game on this device' : 'Need at least 2 players'}</Text>
      </Pressable>

      <Pressable accessibilityRole="link" onPress={() => setPrivacyOpen(true)} hitSlop={10}>
        <Text style={styles.link}>Privacy Policy</Text>
      </Pressable>
      <PrivacyModal visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: 'center', gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { color: UI.text, fontSize: 52, fontWeight: '900', textAlign: 'center', letterSpacing: 8 },
  subtitle: { color: UI.muted, fontSize: 14, textAlign: 'center', marginTop: 4 },
  online: { backgroundColor: UI.accent, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  onlineText: { color: '#1A1A1A', fontSize: 18, fontWeight: '800' },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  seat: { flexBasis: '47%', flexGrow: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  seatColor: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  seatKind: { color: '#FFFFFF', fontSize: 14, marginTop: 4, opacity: 0.95 },
  rules: { backgroundColor: UI.surface, borderRadius: 16, padding: 16, gap: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  ruleText: { color: UI.text, fontSize: 15, flex: 1 },
  start: { backgroundColor: UI.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: UI.accent },
  startText: { color: UI.text, fontSize: 17, fontWeight: '800' },
  link: { color: UI.muted, textAlign: 'center', textDecorationLine: 'underline', fontSize: 14 },
});

import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { COLORS, Color } from '../engine/board';
import { DEFAULT_RULES, PlayerKind, PlayerSetup, Rules } from '../engine/game';
import { PrivacyModal } from './PrivacyModal';
import { LABEL, PALETTE, UI } from './theme';

type Seat = PlayerKind | 'off';

interface Props {
  onStart: (players: PlayerSetup[], rules: Rules) => void;
}

const NEXT: Record<Seat, Seat> = { human: 'bot', bot: 'off', off: 'human' };
const SEAT_LABEL: Record<Seat, string> = { human: 'Player', bot: 'Computer', off: 'Empty' };

export function MenuScreen({ onStart }: Props) {
  const [seats, setSeats] = useState<Record<Color, Seat>>({ red: 'human', green: 'bot', yellow: 'bot', blue: 'bot' });
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const active = COLORS.filter((c) => seats[c] !== 'off');
  const canStart = active.length >= 2;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>LUDO</Text>
      <Text style={styles.subtitle}>Tap a seat to change who plays it</Text>

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
        {(
          [
            ['captureBonus', 'Extra roll after a capture'],
            ['homeBonus', 'Extra roll when a token gets home'],
            ['tripleSixForfeit', 'Three 6s in a row ends your turn'],
          ] as [keyof Rules, string][]
        ).map(([k, label]) => (
          <View key={k} style={styles.ruleRow}>
            <Text style={styles.ruleText}>{label}</Text>
            <Switch value={rules[k]} onValueChange={(v) => setRules((r) => ({ ...r, [k]: v }))} />
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!canStart}
        onPress={() => onStart(active.map((c) => ({ color: c, kind: seats[c] as PlayerKind })), rules)}
        style={({ pressed }) => [styles.start, { opacity: canStart ? (pressed ? 0.8 : 1) : 0.4 }]}
      >
        <Text style={styles.startText}>{canStart ? 'Start game' : 'Need at least 2 players'}</Text>
      </Pressable>

      <Pressable accessibilityRole="link" onPress={() => setPrivacyOpen(true)} hitSlop={10}>
        <Text style={styles.link}>Privacy Policy</Text>
      </Pressable>
      <PrivacyModal visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: 'center', gap: 20, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { color: UI.text, fontSize: 56, fontWeight: '900', textAlign: 'center', letterSpacing: 8 },
  subtitle: { color: UI.muted, fontSize: 15, textAlign: 'center' },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  seat: { flexBasis: '47%', flexGrow: 1, borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  seatColor: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  seatKind: { color: '#FFFFFF', fontSize: 15, marginTop: 4, opacity: 0.95 },
  rules: { backgroundColor: UI.surface, borderRadius: 16, padding: 16, gap: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  ruleText: { color: UI.text, fontSize: 15, flex: 1 },
  start: { backgroundColor: UI.accent, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  link: { color: UI.muted, textAlign: 'center', textDecorationLine: 'underline', fontSize: 14 },
  startText: { color: '#1A1A1A', fontSize: 18, fontWeight: '800' },
});

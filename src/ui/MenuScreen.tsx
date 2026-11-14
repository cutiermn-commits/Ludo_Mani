import React, { useEffect, useState } from 'react';
import { ScrollView, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { COLORS, Color } from '../engine/board';
import { DEFAULT_RULES, Difficulty, GameState, PlayerSetup, Rules } from '../engine/game';
import { FINISHED } from '../engine/board';
import { SaveEnvelope } from '../engine/persist';
import { botName, randomName } from '../engine/names';
import { NameChip } from './NameChip';
import { clearSavedGame, loadSavedGame } from '../storage/savedGame';
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
  human: 'Player on this device',
  easy: 'Computer · Easy',
  medium: 'Computer · Medium',
  hard: 'Computer · Hard',
  off: 'Empty',
};

interface Props {
  /** The device owner's chosen name (plays the first human seat). */
  profileName: string | null;
  onShuffleProfile: () => void;
  onStart: (players: PlayerSetup[], rules: Rules) => void;
  onResume: (state: GameState) => void;
  onOnline: () => void;
}

function timeAgo(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function MenuScreen({ profileName, onShuffleProfile, onStart, onResume, onOnline }: Props) {
  const [saved, setSaved] = useState<SaveEnvelope | null>(null);
  useEffect(() => {
    let alive = true;
    loadSavedGame().then((s) => alive && setSaved(s));
    return () => {
      alive = false;
    };
  }, []);
  const [seats, setSeats] = useState<Record<Color, Seat>>({ red: 'human', green: 'medium', yellow: 'medium', blue: 'medium' });
  // Names for every seat: humans get fun names, computers get bot personalities.
  const [names, setNames] = useState<Record<Color, string>>(() => {
    const taken: string[] = [];
    const out = {} as Record<Color, string>;
    for (const c of COLORS) {
      out[c] = c === 'red' ? randomName(Math.random, taken) : botName('medium', Math.random, taken);
      taken.push(out[c]);
    }
    return out;
  });
  // The first human seat is always "you".
  const firstHuman = COLORS.find((c) => seats[c] === 'human');
  const nameOf = (c: Color) => (c === firstHuman && profileName ? profileName : names[c]);

  const cycleSeat = (c: Color) => {
    const next = NEXT[seats[c]];
    setSeats((s) => ({ ...s, [c]: next }));
    const others = COLORS.filter((x) => x !== c).map(nameOf);
    if (next === 'human') setNames((n) => ({ ...n, [c]: randomName(Math.random, others) }));
    else if (next !== 'off') setNames((n) => ({ ...n, [c]: botName(next, Math.random, others) }));
  };
  const reshuffle = (c: Color) => {
    const others = COLORS.filter((x) => x !== c).map(nameOf);
    setNames((n) => ({ ...n, [c]: randomName(Math.random, others) }));
  };
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const active = COLORS.filter((c) => seats[c] !== 'off');
  const canStart = active.length >= 2;

  const toSetup = (c: Color): PlayerSetup => {
    const s = seats[c];
    return s === 'human'
      ? { color: c, kind: 'human', name: nameOf(c) }
      : { color: c, kind: 'bot', difficulty: s as Difficulty, name: nameOf(c) };
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>LUDO</Text>
      <NameChip label="You are" name={profileName} onShuffle={onShuffleProfile} />

      {saved && (
        <View style={styles.resumeCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resume your unfinished game"
            onPress={() => onResume(saved.state)}
            style={({ pressed }) => [styles.resume, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.resumeText}>Resume game</Text>
            <View style={styles.resumeDots}>
              {saved.state.players.map((p) => (
                <View key={p.color} style={styles.resumeDot}>
                  <View style={[styles.dot, { backgroundColor: PALETTE[p.color].main }]} />
                  <Text style={styles.resumeMeta}>{p.tokens.filter((t) => t === FINISHED).length}/4</Text>
                </View>
              ))}
              <Text style={styles.resumeMeta}>· saved {timeAgo(Date.now() - saved.savedAt)}</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard the saved game"
            hitSlop={10}
            onPress={() => {
              clearSavedGame();
              setSaved(null);
            }}
          >
            <Text style={styles.link}>Discard</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={onOnline}
        style={({ pressed }) => [styles.online, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={styles.onlineText}>Play online with friends</Text>
      </Pressable>

      <Text style={styles.subtitle}>Or play on this device · tap a seat to change it</Text>

      <View style={styles.seats}>
        {COLORS.map((c) => {
          const s = seats[c];
          const you = c === firstHuman;
          return (
            <View key={c} style={[styles.seat, { backgroundColor: s === 'off' ? UI.surface : PALETTE[c].main }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${LABEL[c]} seat: ${s === 'off' ? 'Empty' : nameOf(c)}, ${SEAT_LABEL[s]}. Tap to change.`}
                onPress={() => cycleSeat(c)}
                style={styles.seatMain}
              >
                <Text style={styles.seatColor} numberOfLines={1}>
                  {s === 'off' ? LABEL[c] : nameOf(c)}
                </Text>
                <Text style={styles.seatKind}>{you ? 'You' : SEAT_LABEL[s]}</Text>
              </Pressable>
              {s === 'human' && !you && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`New name for ${LABEL[c]}`}
                  onPress={() => reshuffle(c)}
                  hitSlop={8}
                  style={styles.shuffle}
                >
                  <Text>🎲</Text>
                </Pressable>
              )}
            </View>
          );
        })}
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
        <Text style={styles.startText}>
          {canStart ? (saved ? 'Start new game on this device' : 'Start game on this device') : 'Need at least 2 players'}
        </Text>
      </Pressable>

      <Pressable accessibilityRole="link" onPress={() => setPrivacyOpen(true)} hitSlop={10}>
        <Text style={styles.link}>Privacy Policy</Text>
      </Pressable>
      <PrivacyModal visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  wrap: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { color: UI.text, fontSize: 52, fontWeight: '900', textAlign: 'center', letterSpacing: 8 },
  subtitle: { color: UI.muted, fontSize: 14, textAlign: 'center', marginTop: 4 },
  online: { backgroundColor: UI.accent, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  onlineText: { color: '#1A1A1A', fontSize: 18, fontWeight: '800' },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  seat: { flexBasis: '47%', flexGrow: 1, borderRadius: 16, overflow: 'hidden' },
  seatMain: { paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center' },
  shuffle: { position: 'absolute', top: 6, right: 8 },
  seatColor: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  seatKind: { color: '#FFFFFF', fontSize: 14, marginTop: 4, opacity: 0.95, textAlign: 'center', paddingHorizontal: 6 },
  rules: { backgroundColor: UI.surface, borderRadius: 16, padding: 16, gap: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  ruleText: { color: UI.text, fontSize: 15, flex: 1 },
  start: { backgroundColor: UI.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: UI.accent },
  startText: { color: UI.text, fontSize: 17, fontWeight: '800' },
  resumeCard: { gap: 8 },
  resume: { backgroundColor: '#2E7D32', borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 6 },
  resumeText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  resumeDots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  resumeDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resumeMeta: { color: '#E8F5E9', fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  link: { color: UI.muted, textAlign: 'center', textDecorationLine: 'underline', fontSize: 14 },
});

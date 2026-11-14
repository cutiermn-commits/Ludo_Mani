import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Color, FINISHED } from '../engine/board';
import { GameState, Player, currentPlayer, legalMoves } from '../engine/game';
import { commentary, displayName } from '../engine/quips';
import { Board } from './Board';
import { Dice } from './Dice';
import { PALETTE, UI } from './theme';

const AUTO_MOVE_DELAY = 350;

export function haptic(kind: 'light' | 'success' | 'heavy') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Deterministic pseudo-random generator seeded from a string, so the same event
 *  always shows the same joke (and every device in an online game sees the same one). */
function seededRng(key: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    return (h % 100000) / 100000;
  };
}

function progressScore(p: Player): number {
  return p.tokens.reduce((s, t) => s + (t < 0 ? 0 : t + 1), 0);
}

/** Players ordered for the results screen: most tokens home, then furthest along. */
export function ranking(players: Player[]): Player[] {
  const home = (p: Player) => p.tokens.filter((t) => t === FINISHED).length;
  return [...players].sort((a, b) => home(b) - home(a) || progressScore(b) - progressScore(a));
}

/** Big, short-lived pop-up for special moments ("💥 Captured!"). */
function Toast({ text, eventKey, scale }: { text?: string; eventKey: string; scale: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!text) return;
    setShown(text);
    anim.setValue(0);
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.delay(900),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setShown(undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey]);
  if (!shown) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toastWrap, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
      <Text style={[styles.toast, { fontSize: Math.round(34 * scale) }]}>{shown}</Text>
    </Animated.View>
  );
}

interface Props {
  state: GameState;
  /** Whether this device may act for the given colour (local humans, or "my" colour online). */
  canAct: (color: Color) => boolean;
  onRoll: () => void;
  onMove: (token: number) => void;
  onExit: () => void;
  /** Optional status line shown above the board (e.g. connection or turn timer). */
  banner?: string | null;
  /** Online: the colour this device plays, highlighted in the score bar. */
  youColor?: Color | null;
  /** Local games: start again with the same players. */
  onRematch?: () => void;
}

export function GameView({ state, canAct, onRoll, onMove, onExit, banner, youColor, onRematch }: Props) {
  const { width, height } = useWindowDimensions();
  // Large screens (desktop, TV) scale the dice and text up with the board; phones stay at 1x.
  const k = Math.min(1.8, Math.max(1, Math.min(width, height) / 760));
  const boardSize = Math.floor(Math.min(width - 24, height - 240 * k, 1100));
  const fs = (n: number) => Math.round(n * k);
  // Web with a mouse/keyboard (desktop, TV) gets keyboard hints; touch phones do not.
  const hasKeyboard =
    Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia && !window.matchMedia('(pointer: coarse)').matches;

  const player = currentPlayer(state);
  const moves = useMemo(() => legalMoves(state), [state]);
  const myTurn = state.phase !== 'over' && player.kind === 'human' && canAct(player.color);

  // Commentary (with jokes) for the latest event. Keyed on the event's content, not object
  // identity, so re-sent online states don't reshuffle the joke.
  const eventKey = useMemo(
    () => `${state.current}|${JSON.stringify(state.lastEvent)}|${state.players.map((p) => p.tokens.join(',')).join('/')}`,
    [state],
  );
  const talk = useMemo(() => commentary(state.lastEvent, state, seededRng(eventKey)), [eventKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const rollKey = state.lastEvent.type === 'rolled' || state.lastEvent.type === 'no-moves' || state.lastEvent.type === 'forfeit' ? eventKey : null;

  // Online: a gentle buzz when it becomes your turn.
  const wasMyTurn = useRef(myTurn);
  useEffect(() => {
    if (youColor && myTurn && !wasMyTurn.current) haptic('light');
    wasMyTurn.current = myTurn;
  }, [myTurn, youColor]);

  // Haptics for notable events, whoever caused them.
  const lastEvent = useRef(state.lastEvent);
  useEffect(() => {
    if (lastEvent.current === state.lastEvent) return;
    lastEvent.current = state.lastEvent;
    const e = state.lastEvent;
    if (e.type === 'moved' && e.captured.length) haptic('heavy');
    if (e.type === 'win') haptic('success');
  }, [state.lastEvent]);

  // Auto-play the only legal move for the player on this device.
  useEffect(() => {
    if (!myTurn || state.phase !== 'move' || moves.length !== 1) return;
    const t = setTimeout(() => onMove(moves[0]), AUTO_MOVE_DELAY);
    return () => clearTimeout(t);
  }, [myTurn, state.phase, moves, onMove]);

  const roll = () => {
    haptic('light');
    onRoll();
  };

  // ---- Keyboard / TV remote (web) ----
  // Space or Enter: roll, or move the selected token. Arrow keys: choose a token. 1-4: move that token.
  const [selIdx, setSelIdx] = useState(0);
  useEffect(() => setSelIdx(0), [state]);
  const keyState = useRef({ myTurn, phase: state.phase, moves, selIdx, onMove, roll: () => roll() });
  keyState.current = { myTurn, phase: state.phase, moves, selIdx, onMove, roll: () => roll() };
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const k = keyState.current;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (!k.myTurn || tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (k.phase === 'roll' && (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        k.roll();
      } else if (k.phase === 'move' && k.moves.length) {
        if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          setSelIdx((i) => (i + 1) % k.moves.length);
        } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
          e.preventDefault();
          setSelIdx((i) => (i - 1 + k.moves.length) % k.moves.length);
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          k.onMove(k.moves[k.selIdx % k.moves.length]);
        } else if (/^[1-4]$/.test(e.key) && k.moves.includes(Number(e.key) - 1)) {
          e.preventDefault();
          k.onMove(Number(e.key) - 1);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onTokenPress = (color: Color, token: number) => {
    if (myTurn && color === player.color) onMove(token);
  };

  const movable = myTurn && state.phase === 'move' ? moves.map((token) => ({ color: player.color, token })) : [];
  const shownDice = state.dice ?? (state.lastEvent.type === 'rolled' || state.lastEvent.type === 'no-moves' ? state.lastEvent.value : null);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onExit} hitSlop={12}>
          <Text style={[styles.exit, { fontSize: fs(17) }]}>‹ Menu</Text>
        </Pressable>
        <View style={styles.scores}>
          {state.players.map((p) => (
            <View key={p.color} style={[styles.score, { borderColor: p.color === player.color ? '#FFFFFF' : 'transparent' }]}>
              <View style={[styles.dot, { backgroundColor: PALETTE[p.color].main }]} />
              {p.color === youColor && <Text style={styles.you}>You</Text>}
              <Text style={[styles.scoreText, { fontSize: fs(14) }]}>{p.tokens.filter((t) => t === FINISHED).length}/4</Text>
            </View>
          ))}
        </View>
      </View>

      {banner ? <Text style={[styles.banner, { fontSize: fs(14) }]}>{banner}</Text> : null}

      <Board
        size={boardSize}
        players={state.players}
        movable={movable}
        selected={Platform.OS === 'web' && movable.length > 1 ? { color: player.color, token: moves[selIdx % moves.length] } : null}
        current={state.phase === 'over' ? null : player.color}
        onTokenPress={onTokenPress}
      />
      <Toast text={talk.toast} eventKey={eventKey} scale={k} />

      <View style={styles.footer}>
        {state.phase === 'over' ? (
          <View style={styles.over}>
            <Text style={[styles.winner, { color: PALETTE[state.winner!].main, fontSize: fs(30) }]} numberOfLines={2}>
              🏆 {state.winner === youColor ? 'You win!' : `${displayName(state.players.find((p) => p.color === state.winner)!)} wins!`}
            </Text>
            <Text style={[styles.message, { fontSize: fs(15), textAlign: 'center' }]}>{talk.text}</Text>
            <View style={styles.rankList}>
              {ranking(state.players).map((p, i) => (
                <View key={p.color} style={styles.rankRow}>
                  <Text style={[styles.rankPos, { fontSize: fs(16) }]}>{['🥇', '🥈', '🥉', '4.'][i]}</Text>
                  <View style={[styles.dot, { backgroundColor: PALETTE[p.color].main }]} />
                  <Text style={[styles.rankName, { fontSize: fs(16) }]} numberOfLines={1}>
                    {displayName(p)}
                    {p.color === youColor ? ' (you)' : ''}
                  </Text>
                  <Text style={[styles.scoreText, { fontSize: fs(14) }]}>{p.tokens.filter((t) => t === FINISHED).length}/4 home</Text>
                </View>
              ))}
            </View>
            <View style={styles.overButtons}>
              {onRematch && (
                <Pressable style={styles.again} onPress={onRematch} accessibilityRole="button">
                  <Text style={styles.againText}>Rematch</Text>
                </Pressable>
              )}
              <Pressable style={[styles.again, styles.secondary]} onPress={onExit} accessibilityRole="button">
                <Text style={[styles.againText, { color: UI.text }]}>Menu</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Dice
              rollKey={rollKey}
              size={Math.round(72 * k)}
              value={shownDice}
              color={PALETTE[player.color].main}
              enabled={myTurn && state.phase === 'roll'}
              onPress={roll}
            />
            <View style={styles.status}>
              <Text style={[styles.turn, { color: PALETTE[player.color].main, fontSize: fs(22) }]} numberOfLines={1}>
                {player.color === youColor ? 'Your turn!' : `${displayName(player)}'s turn${player.kind === 'bot' ? ' 🤖' : ''}`}
              </Text>
              <Text style={[styles.message, { fontSize: fs(15) }]}>
                {myTurn && state.phase === 'roll' && (state.lastEvent.type === 'start' || state.lastEvent.type === 'moved')
                  ? `${talk.text} ${hasKeyboard ? 'Click the dice or press Space to roll.' : 'Tap the dice to roll!'}`
                  : myTurn && state.phase === 'move' && moves.length > 1
                    ? `${talk.text} Tap a glowing token.`
                    : talk.text}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 16 },
  header: { width: '100%', maxWidth: 1100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  exit: { color: UI.text, fontSize: 17, fontWeight: '600' },
  scores: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, flexShrink: 1, marginLeft: 8 },
  score: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12, borderWidth: 2, backgroundColor: UI.surface },
  dot: { width: 12, height: 12, borderRadius: 6 },
  scoreText: { color: UI.text, fontWeight: '700' },
  you: { color: UI.accent, fontWeight: '800', fontSize: 12 },
  banner: { color: UI.accent, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  footer: { width: '100%', maxWidth: 1100, flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 90 },
  status: { flex: 1 },
  turn: { fontSize: 22, fontWeight: '800' },
  message: { color: UI.muted, fontSize: 15, marginTop: 4 },
  over: { flex: 1, alignItems: 'center', gap: 10 },
  rankList: { alignSelf: 'stretch', gap: 6, backgroundColor: UI.surface, borderRadius: 14, padding: 12 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankPos: { width: 30, textAlign: 'center' },
  rankName: { color: UI.text, fontWeight: '700', flex: 1 },
  overButtons: { flexDirection: 'row', gap: 12 },
  secondary: { backgroundColor: UI.surface, borderWidth: 2, borderColor: UI.accent },
  toastWrap: { position: 'absolute', top: '40%', alignSelf: 'center', zIndex: 10 },
  toast: {
    color: '#FFFFFF',
    fontWeight: '900',
    backgroundColor: 'rgba(15,27,45,0.88)',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  winner: { fontSize: 32, fontWeight: '900' },
  again: { backgroundColor: UI.accent, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  againText: { color: '#1A1A1A', fontSize: 17, fontWeight: '800' },
});

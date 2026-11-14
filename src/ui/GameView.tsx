import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Color, FINISHED } from '../engine/board';
import { GameEvent, GameState, currentPlayer, legalMoves } from '../engine/game';
import { Board } from './Board';
import { Dice } from './Dice';
import { LABEL, PALETTE, UI } from './theme';

const AUTO_MOVE_DELAY = 350;

export function haptic(kind: 'light' | 'success' | 'heavy') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function describe(e: GameEvent): string {
  switch (e.type) {
    case 'start':
      return 'Roll a 6 to bring a token out.';
    case 'rolled':
      return `${LABEL[e.color]} rolled ${e.value}. Choose a token.`;
    case 'no-moves':
      return `${LABEL[e.color]} rolled ${e.value} — no moves.`;
    case 'forfeit':
      return `${LABEL[e.color]} rolled three 6s — turn lost!`;
    case 'moved':
      if (e.captured.length) return `${LABEL[e.color]} captured ${e.captured.map((c) => LABEL[c.color]).join(', ')}!`;
      if (e.finished) return `${LABEL[e.color]} got a token home!`;
      return `${LABEL[e.color]} moved.`;
    case 'win':
      return `${LABEL[e.color]} wins!`;
  }
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
}

export function GameView({ state, canAct, onRoll, onMove, onExit, banner, youColor }: Props) {
  const { width, height } = useWindowDimensions();
  const boardSize = Math.floor(Math.min(width - 24, height - 240, 900));

  const player = currentPlayer(state);
  const moves = useMemo(() => legalMoves(state), [state]);
  const myTurn = state.phase !== 'over' && player.kind === 'human' && canAct(player.color);

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

  const onTokenPress = (color: Color, token: number) => {
    if (myTurn && color === player.color) onMove(token);
  };

  const movable = myTurn && state.phase === 'move' ? moves.map((token) => ({ color: player.color, token })) : [];
  const shownDice = state.dice ?? (state.lastEvent.type === 'rolled' || state.lastEvent.type === 'no-moves' ? state.lastEvent.value : null);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onExit} hitSlop={12}>
          <Text style={styles.exit}>‹ Menu</Text>
        </Pressable>
        <View style={styles.scores}>
          {state.players.map((p) => (
            <View key={p.color} style={[styles.score, { borderColor: p.color === player.color ? '#FFFFFF' : 'transparent' }]}>
              <View style={[styles.dot, { backgroundColor: PALETTE[p.color].main }]} />
              {p.color === youColor && <Text style={styles.you}>You</Text>}
              <Text style={styles.scoreText}>{p.tokens.filter((t) => t === FINISHED).length}/4</Text>
            </View>
          ))}
        </View>
      </View>

      {banner ? <Text style={styles.banner}>{banner}</Text> : null}

      <Board size={boardSize} players={state.players} movable={movable} onTokenPress={onTokenPress} />

      <View style={styles.footer}>
        {state.phase === 'over' ? (
          <View style={styles.over}>
            <Text style={[styles.winner, { color: PALETTE[state.winner!].main }]}>{LABEL[state.winner!]} wins!</Text>
            <Pressable style={styles.again} onPress={onExit} accessibilityRole="button">
              <Text style={styles.againText}>New game</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Dice
              value={shownDice}
              color={PALETTE[player.color].main}
              enabled={myTurn && state.phase === 'roll'}
              onPress={roll}
            />
            <View style={styles.status}>
              <Text style={[styles.turn, { color: PALETTE[player.color].main }]}>
                {LABEL[player.color]}
                {player.kind === 'bot' ? ' (computer)' : player.color === youColor ? ' (you)' : ''}
              </Text>
              <Text style={styles.message}>
                {myTurn && state.phase === 'roll' && state.lastEvent.type !== 'no-moves' && state.lastEvent.type !== 'forfeit'
                  ? 'Tap the dice to roll'
                  : describe(state.lastEvent)}
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
  header: { width: '100%', maxWidth: 900, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  exit: { color: UI.text, fontSize: 17, fontWeight: '600' },
  scores: { flexDirection: 'row', gap: 8 },
  score: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 2, backgroundColor: UI.surface },
  dot: { width: 12, height: 12, borderRadius: 6 },
  scoreText: { color: UI.text, fontWeight: '700' },
  you: { color: UI.accent, fontWeight: '800', fontSize: 12 },
  banner: { color: UI.accent, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  footer: { width: '100%', maxWidth: 900, flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 90 },
  status: { flex: 1 },
  turn: { fontSize: 22, fontWeight: '800' },
  message: { color: UI.muted, fontSize: 15, marginTop: 4 },
  over: { flex: 1, alignItems: 'center', gap: 12 },
  winner: { fontSize: 32, fontWeight: '900' },
  again: { backgroundColor: UI.accent, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  againText: { color: '#1A1A1A', fontSize: 17, fontWeight: '800' },
});

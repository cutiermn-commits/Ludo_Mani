import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Color, FINISHED } from '../engine/board';
import { GameEvent, GameState, chooseBotMove, currentPlayer, legalMoves, move, roll } from '../engine/game';
import { Board } from './Board';
import { Dice } from './Dice';
import { LABEL, PALETTE, UI } from './theme';

const BOT_ROLL_DELAY = 700;
const BOT_MOVE_DELAY = 550;
const AUTO_MOVE_DELAY = 350;

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function haptic(kind: 'light' | 'success' | 'heavy') {
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
  initial: GameState;
  onExit: () => void;
}

export function GameScreen({ initial, onExit }: Props) {
  const [state, setState] = useState(initial);
  const { width, height } = useWindowDimensions();
  const boardSize = Math.floor(Math.min(width - 24, height - 220, 900));

  const player = currentPlayer(state);
  const moves = useMemo(() => legalMoves(state), [state]);
  const isHumanTurn = player.kind === 'human' && state.phase !== 'over';

  const doRoll = useCallback(() => {
    setState((s) => (s.phase === 'roll' ? roll(s, rollDie()) : s));
    haptic('light');
  }, []);

  const doMove = useCallback((token: number) => {
    setState((s) => {
      if (s.phase !== 'move' || !legalMoves(s).includes(token)) return s;
      const next = move(s, token);
      if (next.lastEvent.type === 'moved' && next.lastEvent.captured.length) haptic('heavy');
      if (next.lastEvent.type === 'win') haptic('success');
      return next;
    });
  }, []);

  // Drive bots, and auto-play a human's only legal move.
  useEffect(() => {
    if (state.phase === 'over') return;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (player.kind === 'bot') {
      if (state.phase === 'roll') t = setTimeout(doRoll, BOT_ROLL_DELAY);
      else t = setTimeout(() => doMove(chooseBotMove(state)), BOT_MOVE_DELAY);
    } else if (state.phase === 'move' && moves.length === 1) {
      t = setTimeout(() => doMove(moves[0]), AUTO_MOVE_DELAY);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [state, player.kind, moves, doRoll, doMove]);

  const onTokenPress = (color: Color, token: number) => {
    if (isHumanTurn && color === player.color) doMove(token);
  };

  const movable = isHumanTurn ? moves.map((token) => ({ color: player.color, token })) : [];
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
              <Text style={styles.scoreText}>{p.tokens.filter((t) => t === FINISHED).length}/4</Text>
            </View>
          ))}
        </View>
      </View>

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
              enabled={isHumanTurn && state.phase === 'roll'}
              onPress={doRoll}
            />
            <View style={styles.status}>
              <Text style={[styles.turn, { color: PALETTE[player.color].main }]}>
                {LABEL[player.color]}
                {player.kind === 'bot' ? ' (computer)' : ''}
              </Text>
              <Text style={styles.message}>
                {isHumanTurn && state.phase === 'roll' && state.lastEvent.type !== 'no-moves' && state.lastEvent.type !== 'forfeit'
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
  footer: { width: '100%', maxWidth: 900, flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 90 },
  status: { flex: 1 },
  turn: { fontSize: 22, fontWeight: '800' },
  message: { color: UI.muted, fontSize: 15, marginTop: 4 },
  over: { flex: 1, alignItems: 'center', gap: 12 },
  winner: { fontSize: 32, fontWeight: '900' },
  again: { backgroundColor: UI.accent, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  againText: { color: '#1A1A1A', fontSize: 17, fontWeight: '800' },
});

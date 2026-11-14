// Pure, deterministic Ludo rules engine. No React, no randomness inside:
// dice values are passed in, so every rule is unit-testable and replayable.

import {
  COLORS,
  Color,
  FINISHED,
  IN_BASE,
  LAST_TRACK_PROGRESS,
  SAFE_INDICES,
  trackIndex,
} from './board';

export type PlayerKind = 'human' | 'bot';

export interface Player {
  color: Color;
  kind: PlayerKind;
  /** Progress per token: -1 base, 0..50 shared track, 51..55 home column, 56 finished. */
  tokens: number[];
}

export interface Rules {
  /** Rolling 6 three times in a row forfeits the turn. */
  tripleSixForfeit: boolean;
  /** Capturing an opponent grants an extra roll. */
  captureBonus: boolean;
  /** Bringing a token home grants an extra roll. */
  homeBonus: boolean;
}

export const DEFAULT_RULES: Rules = {
  tripleSixForfeit: true,
  captureBonus: true,
  homeBonus: true,
};

export type Phase = 'roll' | 'move' | 'over';

export type GameEvent =
  | { type: 'start' }
  | { type: 'rolled'; color: Color; value: number }
  | { type: 'no-moves'; color: Color; value: number }
  | { type: 'forfeit'; color: Color }
  | { type: 'moved'; color: Color; token: number; captured: { color: Color; token: number }[]; finished: boolean }
  | { type: 'win'; color: Color };

export interface GameState {
  players: Player[];
  current: number;
  dice: number | null;
  phase: Phase;
  sixesInRow: number;
  winner: Color | null;
  rules: Rules;
  lastEvent: GameEvent;
}

export interface PlayerSetup {
  color: Color;
  kind: PlayerKind;
}

export function createGame(setup: PlayerSetup[], rules: Rules = DEFAULT_RULES): GameState {
  if (setup.length < 2 || setup.length > 4) throw new Error('Ludo needs 2 to 4 players');
  const colors = new Set(setup.map((p) => p.color));
  if (colors.size !== setup.length) throw new Error('Each player needs a unique colour');
  // Keep clockwise seating order regardless of how setup was passed.
  const ordered = [...setup].sort((a, b) => COLORS.indexOf(a.color) - COLORS.indexOf(b.color));
  return {
    players: ordered.map((p) => ({ color: p.color, kind: p.kind, tokens: [IN_BASE, IN_BASE, IN_BASE, IN_BASE] })),
    current: 0,
    dice: null,
    phase: 'roll',
    sixesInRow: 0,
    winner: null,
    rules,
    lastEvent: { type: 'start' },
  };
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.current];
}

/** Target progress for a token with the given roll, or null if the move is illegal. */
export function targetProgress(progress: number, roll: number): number | null {
  if (progress === FINISHED) return null;
  if (progress === IN_BASE) return roll === 6 ? 0 : null;
  const t = progress + roll;
  return t <= FINISHED ? t : null; // exact roll needed to finish
}

/** Token indices of the current player that can legally move with the current dice. */
export function legalMoves(state: GameState): number[] {
  if (state.phase !== 'move' || state.dice === null) return [];
  const p = currentPlayer(state);
  return p.tokens.flatMap((prog, i) => (targetProgress(prog, state.dice!) !== null ? [i] : []));
}

function nextPlayer(state: GameState): GameState {
  return { ...state, current: (state.current + 1) % state.players.length, dice: null, phase: 'roll', sixesInRow: 0 };
}

/** Apply a dice roll (1..6) for the current player. */
export function roll(state: GameState, value: number): GameState {
  if (state.phase !== 'roll') throw new Error(`Cannot roll during phase "${state.phase}"`);
  if (!Number.isInteger(value) || value < 1 || value > 6) throw new Error(`Invalid dice value ${value}`);
  const color = currentPlayer(state).color;
  const sixesInRow = value === 6 ? state.sixesInRow + 1 : 0;

  if (state.rules.tripleSixForfeit && sixesInRow === 3) {
    return { ...nextPlayer(state), lastEvent: { type: 'forfeit', color } };
  }

  const rolled: GameState = { ...state, dice: value, phase: 'move', sixesInRow, lastEvent: { type: 'rolled', color, value } };
  if (legalMoves(rolled).length === 0) {
    return { ...nextPlayer(state), lastEvent: { type: 'no-moves', color, value } };
  }
  return rolled;
}

/** Move the given token of the current player by the current dice value. */
export function move(state: GameState, tokenIndex: number): GameState {
  if (state.phase !== 'move' || state.dice === null) throw new Error('No dice rolled');
  if (!legalMoves(state).includes(tokenIndex)) throw new Error(`Token ${tokenIndex} cannot move`);

  const dice = state.dice;
  const mover = currentPlayer(state);
  const target = targetProgress(mover.tokens[tokenIndex], dice)!;

  const players = state.players.map((p) => ({ ...p, tokens: [...p.tokens] }));
  players[state.current].tokens[tokenIndex] = target;

  // Captures: opponent tokens on the same non-safe shared-track square go back to base.
  const captured: { color: Color; token: number }[] = [];
  const landing = trackIndex(mover.color, target);
  if (landing !== null && !SAFE_INDICES.has(landing)) {
    players.forEach((p, pi) => {
      if (pi === state.current) return;
      p.tokens.forEach((prog, ti) => {
        if (trackIndex(p.color, prog) === landing) {
          p.tokens[ti] = IN_BASE;
          captured.push({ color: p.color, token: ti });
        }
      });
    });
  }

  const finished = target === FINISHED;
  const moved: GameEvent = { type: 'moved', color: mover.color, token: tokenIndex, captured, finished };

  if (players[state.current].tokens.every((t) => t === FINISHED)) {
    return { ...state, players, dice: null, phase: 'over', winner: mover.color, lastEvent: { type: 'win', color: mover.color } };
  }

  const extraTurn =
    dice === 6 || (state.rules.captureBonus && captured.length > 0) || (state.rules.homeBonus && finished);

  const after: GameState = { ...state, players, lastEvent: moved };
  if (extraTurn) {
    // A bonus roll from capture/home does not count toward the triple-six streak unless it was a 6.
    return { ...after, dice: null, phase: 'roll', sixesInRow: dice === 6 ? state.sixesInRow : 0 };
  }
  return { ...nextPlayer(after), lastEvent: moved };
}

/** True if a square (absolute track index) can be hit by an opponent of `color` next turn. */
export function isThreatened(state: GameState, color: Color, absIndex: number): boolean {
  if (SAFE_INDICES.has(absIndex)) return false;
  return state.players.some(
    (p) =>
      p.color !== color &&
      p.tokens.some((prog) => {
        const from = trackIndex(p.color, prog);
        if (from === null) return false;
        const dist = (absIndex - from + 52) % 52;
        return dist >= 1 && dist <= 6 && prog + dist <= LAST_TRACK_PROGRESS;
      }),
  );
}

/** Simple heuristic bot: returns the token index to move. */
export function chooseBotMove(state: GameState): number {
  const moves = legalMoves(state);
  if (moves.length === 0) throw new Error('No legal moves');
  const me = currentPlayer(state);
  const dice = state.dice!;

  let best = moves[0];
  let bestScore = -Infinity;
  for (const ti of moves) {
    const from = me.tokens[ti];
    const to = targetProgress(from, dice)!;
    const toAbs = trackIndex(me.color, to);
    const fromAbs = trackIndex(me.color, from);
    let score = to; // prefer advancing further tokens slightly

    if (to === FINISHED) score += 100;
    if (from === IN_BASE) score += 40;
    if (to > LAST_TRACK_PROGRESS && from <= LAST_TRACK_PROGRESS) score += 30; // safe in home column
    if (toAbs !== null) {
      if (SAFE_INDICES.has(toAbs)) score += 15;
      const hits = state.players.some(
        (p) => p.color !== me.color && p.tokens.some((pr) => trackIndex(p.color, pr) === toAbs),
      );
      if (hits && !SAFE_INDICES.has(toAbs)) score += 60;
      if (isThreatened(state, me.color, toAbs)) score -= 35;
    }
    if (fromAbs !== null && isThreatened(state, me.color, fromAbs)) score += 25; // escape danger

    if (score > bestScore) {
      bestScore = score;
      best = ti;
    }
  }
  return best;
}

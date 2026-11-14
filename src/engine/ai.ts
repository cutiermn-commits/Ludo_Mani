// Computer players. Three levels:
//  easy   – mostly random legal moves, takes an obvious finish/capture only sometimes.
//  medium – one-move heuristic (prefers finishing, capturing, leaving base, safety).
//  hard   – evaluates the whole position after each move, including the probability
//           that each of its tokens is captured before its next turn.
// All functions are pure; randomness is injected so games are reproducible in tests.

import { Color, FINISHED, IN_BASE, LAST_TRACK_PROGRESS, SAFE_INDICES, TRACK_LENGTH, trackIndex } from './board';
import { Difficulty, GameState, Player, currentPlayer, legalMoves, move, targetProgress } from './game';

export type Rng = () => number; // returns [0, 1)

/** Squares (absolute track indices) from which an opponent of `color` can hit `absIndex` with one die. */
function attackerDistances(state: GameState, color: Color, absIndex: number): number[][] {
  // One entry per opponent: the distinct dice values that would let them land on absIndex.
  return state.players
    .filter((p) => p.color !== color)
    .map((p) => {
      const ds = new Set<number>();
      for (const prog of p.tokens) {
        const from = trackIndex(p.color, prog);
        if (from === null) continue;
        const dist = (absIndex - from + TRACK_LENGTH) % TRACK_LENGTH;
        if (dist >= 1 && dist <= 6 && prog + dist <= LAST_TRACK_PROGRESS) ds.add(dist);
      }
      return [...ds];
    });
}

/** True if any opponent can land on the square next turn with a single die. */
export function isThreatened(state: GameState, color: Color, absIndex: number): boolean {
  if (SAFE_INDICES.has(absIndex)) return false;
  return attackerDistances(state, color, absIndex).some((d) => d.length > 0);
}

/** Approximate probability the square is hit before `color` moves again (single-die reach only). */
export function hitProbability(state: GameState, color: Color, absIndex: number): number {
  if (SAFE_INDICES.has(absIndex)) return 0;
  let survive = 1;
  for (const dists of attackerDistances(state, color, absIndex)) survive *= 1 - dists.length / 6;
  return 1 - survive;
}

function mediumMove(state: GameState): number {
  const moves = legalMoves(state);
  const me = currentPlayer(state);
  const dice = state.dice!;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const ti of moves) {
    const from = me.tokens[ti];
    const to = targetProgress(from, dice)!;
    const toAbs = trackIndex(me.color, to);
    const fromAbs = trackIndex(me.color, from);
    let score = to;
    if (to === FINISHED) score += 100;
    if (from === IN_BASE) score += 40;
    if (to > LAST_TRACK_PROGRESS && from <= LAST_TRACK_PROGRESS) score += 30;
    if (toAbs !== null) {
      if (SAFE_INDICES.has(toAbs)) score += 15;
      const hits = state.players.some((p) => p.color !== me.color && p.tokens.some((pr) => trackIndex(p.color, pr) === toAbs));
      if (hits && !SAFE_INDICES.has(toAbs)) score += 60;
      if (isThreatened(state, me.color, toAbs)) score -= 35;
    }
    if (fromAbs !== null && isThreatened(state, me.color, fromAbs)) score += 25;
    if (score > bestScore) {
      bestScore = score;
      best = ti;
    }
  }
  return best;
}

/** Value of a token's progress for the position evaluator. */
function tokenValue(progress: number): number {
  if (progress === IN_BASE) return 0;
  if (progress === FINISHED) return 90;
  if (progress > LAST_TRACK_PROGRESS) return 70 + (progress - LAST_TRACK_PROGRESS); // safe in home column
  return 12 + progress;
}

function playerValue(p: Player): number {
  return p.tokens.reduce((s, t) => s + tokenValue(t), 0);
}

/** Position score from `color`'s point of view. */
function evaluate(state: GameState, color: Color): number {
  const me = state.players.find((p) => p.color === color)!;
  let score = playerValue(me);
  for (const t of me.tokens) {
    const abs = trackIndex(color, t);
    if (abs !== null) score -= hitProbability(state, color, abs) * tokenValue(t);
  }
  const opp = state.players.filter((p) => p.color !== color);
  score -= opp.reduce((s, p) => s + playerValue(p), 0) * (1.0 / opp.length);
  return score;
}

function hardMove(state: GameState): number {
  const moves = legalMoves(state);
  const me = currentPlayer(state);
  let best = moves[0];
  let bestScore = -Infinity;
  for (const ti of moves) {
    const next = move(state, ti);
    let score = evaluate(next, me.color);
    if (next.phase === 'over') score += 10_000;
    // Another roll for us is worth roughly an average move.
    if (next.phase === 'roll' && currentPlayer(next).color === me.color) score += 8;
    if (score > bestScore) {
      bestScore = score;
      best = ti;
    }
  }
  return best;
}

function easyMove(state: GameState, rng: Rng): number {
  const moves = legalMoves(state);
  return rng() < 0.3 ? mediumMove(state) : moves[Math.floor(rng() * moves.length)];
}

/** Token index the current (bot) player should move. */
export function chooseBotMove(state: GameState, difficulty: Difficulty = 'medium', rng: Rng = Math.random): number {
  if (legalMoves(state).length === 0) throw new Error('No legal moves');
  switch (difficulty) {
    case 'easy':
      return easyMove(state, rng);
    case 'hard':
      return hardMove(state);
    default:
      return mediumMove(state);
  }
}

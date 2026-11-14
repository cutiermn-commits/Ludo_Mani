// Serialisation of a local game for save/resume. Stored data is untrusted
// (older app versions, corruption), so it is validated strictly before use.

import { COLORS, FINISHED, IN_BASE } from './board';
import { GameState, legalMoves } from './game';
import { isKnownName } from './names';

export const SAVE_VERSION = 1;

export interface SaveEnvelope {
  v: number;
  savedAt: number; // epoch ms
  state: GameState;
}

const isObj = (x: unknown): x is Record<string, any> => typeof x === 'object' && x !== null && !Array.isArray(x);

export function isValidGameState(s: unknown): s is GameState {
  if (!isObj(s)) return false;
  const { players, current, dice, phase, sixesInRow, winner, rules, lastEvent } = s;
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) return false;
  const seen = new Set<string>();
  for (const p of players) {
    if (!isObj(p) || !COLORS.includes(p.color) || seen.has(p.color)) return false;
    seen.add(p.color);
    if (p.kind !== 'human' && p.kind !== 'bot') return false;
    if (p.difficulty !== undefined && !['easy', 'medium', 'hard'].includes(p.difficulty)) return false;
    if (p.name !== undefined && !isKnownName(p.name)) return false;
    if (!Array.isArray(p.tokens) || p.tokens.length !== 4) return false;
    if (!p.tokens.every((t: unknown) => Number.isInteger(t) && (t as number) >= IN_BASE && (t as number) <= FINISHED)) return false;
  }
  if (!Number.isInteger(current) || current < 0 || current >= players.length) return false;
  if (!['roll', 'move', 'over'].includes(phase)) return false;
  if (phase === 'move' ? !(Number.isInteger(dice) && dice >= 1 && dice <= 6) : dice !== null) return false;
  if (!Number.isInteger(sixesInRow) || sixesInRow < 0 || sixesInRow > 2) return false;
  if (winner !== null && !seen.has(winner)) return false;
  if (!isObj(rules) || !['tripleSixForfeit', 'captureBonus', 'homeBonus'].every((k) => typeof rules[k] === 'boolean')) return false;
  if (!isObj(lastEvent) || typeof lastEvent.type !== 'string') return false;
  // A saved "move" phase must actually have a legal move, or the game would be stuck.
  if (phase === 'move' && legalMoves(s as unknown as GameState).length === 0) return false;
  return true;
}

export function serialize(state: GameState, now: number): string {
  const env: SaveEnvelope = { v: SAVE_VERSION, savedAt: now, state };
  return JSON.stringify(env);
}

/** Returns the saved game if it is valid, resumable (not finished) and from this save version. */
export function deserialize(raw: string | null): SaveEnvelope | null {
  if (!raw) return null;
  let env: unknown;
  try {
    env = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(env) || env.v !== SAVE_VERSION || typeof env.savedAt !== 'number') return null;
  if (!isValidGameState(env.state) || env.state.phase === 'over') return null;
  return env as SaveEnvelope;
}

// Wire protocol shared by the app and the game server (JSON over WebSocket).
// No free-text fields exist anywhere in the protocol: names can only come from the curated
// lists in src/engine/names.ts and are validated here and on the server. This keeps the app
// out of "user-generated content" territory (App Store Review Guideline 1.2).

import { COLORS, Color } from '../engine/board';
import { Difficulty, GameState, Rules } from '../engine/game';
import { isAllowedName } from '../engine/names';

export const PROTOCOL_VERSION = 1;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
export const ROOM_CODE_LENGTH = 6;

export type SeatKind = 'human' | 'bot' | 'open';

export interface SeatView {
  color: Color;
  kind: SeatKind;
  connected: boolean; // humans only; bots are always "connected"
  difficulty?: Difficulty;
  name?: string;
}

export interface RoomView {
  code: string;
  hostColor: Color | null;
  seats: SeatView[];
  rules: Rules;
  state: GameState | null;
  /** Milliseconds (at send time) until the current human turn is auto-played, if any.
   *  Relative rather than absolute so device clock skew does not matter. */
  turnMsLeft: number | null;
}

export type ClientMessage =
  | { t: 'create'; v: number; name?: string }
  | { t: 'join'; v: number; code: string; name?: string }
  | { t: 'rename'; name: string }
  | { t: 'resume'; v: number; code: string; playerId: string; secret: string }
  | { t: 'seat'; color: Color; kind: 'bot' | 'open'; difficulty?: Difficulty }
  | { t: 'rules'; rules: Rules }
  | { t: 'start' }
  | { t: 'roll' }
  | { t: 'move'; token: number }
  | { t: 'leave' }
  | { t: 'ping' };

export type ErrorCode =
  | 'bad-request'
  | 'version'
  | 'not-found'
  | 'full'
  | 'started'
  | 'not-host'
  | 'not-your-turn'
  | 'illegal'
  | 'auth'
  | 'rate-limit'
  | 'capacity';

export type ServerMessage =
  | { t: 'welcome'; code: string; playerId: string; secret: string; color: Color }
  | { t: 'room'; room: RoomView }
  | { t: 'error'; code: ErrorCode; message: string }
  | { t: 'left' }
  | { t: 'pong' };

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
const isColor = (x: unknown): x is Color => typeof x === 'string' && (COLORS as string[]).includes(x);
const isDifficulty = (x: unknown): x is Difficulty => typeof x === 'string' && (DIFFICULTIES as string[]).includes(x);
const isCode = (x: unknown): x is string =>
  typeof x === 'string' && x.length === ROOM_CODE_LENGTH && [...x].every((ch) => ROOM_CODE_ALPHABET.includes(ch));
const isToken = (x: unknown): x is string => typeof x === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(x);

function isRules(x: unknown): x is Rules {
  return (
    isObj(x) &&
    typeof x.tripleSixForfeit === 'boolean' &&
    typeof x.captureBonus === 'boolean' &&
    typeof x.homeBonus === 'boolean' &&
    Object.keys(x).length === 3
  );
}

/** Strictly validate an untrusted client message. Returns null if invalid. */
export function parseClientMessage(raw: string): ClientMessage | null {
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(m) || typeof m.t !== 'string') return null;
  switch (m.t) {
    case 'create':
      if (m.name !== undefined && !isAllowedName(m.name)) return null;
      return typeof m.v === 'number' ? { t: 'create', v: m.v, ...(m.name ? { name: m.name } : {}) } : null;
    case 'join':
      if (m.name !== undefined && !isAllowedName(m.name)) return null;
      return typeof m.v === 'number' && isCode(m.code) ? { t: 'join', v: m.v, code: m.code, ...(m.name ? { name: m.name } : {}) } : null;
    case 'rename':
      return isAllowedName(m.name) ? { t: 'rename', name: m.name } : null;
    case 'resume':
      return typeof m.v === 'number' && isCode(m.code) && isToken(m.playerId) && isToken(m.secret)
        ? { t: 'resume', v: m.v, code: m.code, playerId: m.playerId, secret: m.secret }
        : null;
    case 'seat':
      if (!isColor(m.color) || (m.kind !== 'bot' && m.kind !== 'open')) return null;
      if (m.kind === 'bot' && m.difficulty !== undefined && !isDifficulty(m.difficulty)) return null;
      return { t: 'seat', color: m.color, kind: m.kind, ...(m.kind === 'bot' ? { difficulty: (m.difficulty as Difficulty) ?? 'medium' } : {}) };
    case 'rules':
      return isRules(m.rules) ? { t: 'rules', rules: { ...m.rules } } : null;
    case 'move':
      return Number.isInteger(m.token) && (m.token as number) >= 0 && (m.token as number) <= 3 ? { t: 'move', token: m.token as number } : null;
    case 'start':
    case 'roll':
    case 'leave':
    case 'ping':
      return { t: m.t };
    default:
      return null;
  }
}

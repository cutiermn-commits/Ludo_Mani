// One online game room. The server is authoritative: it rolls the dice, validates every
// move with the shared rules engine, drives bots, and auto-plays turns for idle or
// disconnected players so a game can never stall.

import { timingSafeEqual } from 'node:crypto';
import { COLORS, Color } from '../../src/engine/board';
import { chooseBotMove } from '../../src/engine/ai';
import { DEFAULT_RULES, Difficulty, GameState, Rules, createGame, currentPlayer, legalMoves, move, roll } from '../../src/engine/game';
import { ErrorCode, RoomView, ServerMessage, SeatKind } from '../../src/net/protocol';

export interface Conn {
  send(msg: ServerMessage): void;
}

export interface Deps {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  /** Uniform integer in [0, maxExclusive). Must be cryptographically secure in production. */
  randomInt(maxExclusive: number): number;
  /** Unguessable URL-safe token. */
  token(): string;
}

export interface Timing {
  botDelayMs: number;
  turnTimeoutMs: number;
  disconnectedTurnTimeoutMs: number;
}

export const DEFAULT_TIMING: Timing = { botDelayMs: 700, turnTimeoutMs: 30_000, disconnectedTurnTimeoutMs: 8_000 };

/** Seat fill order: opposite corners first so a 2-player game is face to face. */
const JOIN_ORDER: Color[] = ['red', 'yellow', 'green', 'blue'];

interface Seat {
  kind: SeatKind;
  playerId?: string;
  secret?: string;
  conn?: Conn | null;
  difficulty?: Difficulty;
}

export class RoomError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message);
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export class Room {
  readonly seats: Record<Color, Seat> = { red: { kind: 'open' }, green: { kind: 'open' }, yellow: { kind: 'open' }, blue: { kind: 'open' } };
  rules: Rules = DEFAULT_RULES;
  state: GameState | null = null;
  hostId: string | null = null;
  lastActivity: number;
  private timer: unknown = null;
  private deadline: number | null = null;

  constructor(
    readonly code: string,
    private deps: Deps,
    private timing: Timing = DEFAULT_TIMING,
  ) {
    this.lastActivity = deps.now();
  }

  // ---------- queries ----------

  colorOf(playerId: string): Color | null {
    return COLORS.find((c) => this.seats[c].playerId === playerId) ?? null;
  }

  humanCount(): number {
    return COLORS.filter((c) => this.seats[c].kind === 'human').length;
  }

  connectedHumans(): number {
    return COLORS.filter((c) => this.seats[c].kind === 'human' && this.seats[c].conn).length;
  }

  view(): RoomView {
    return {
      code: this.code,
      hostColor: this.hostId ? this.colorOf(this.hostId) : null,
      seats: COLORS.map((color) => {
        const s = this.seats[color];
        return {
          color,
          kind: s.kind,
          connected: s.kind === 'bot' || !!s.conn,
          ...(s.kind === 'bot' ? { difficulty: s.difficulty } : {}),
        };
      }),
      rules: this.rules,
      state: this.state,
      turnMsLeft: this.deadline === null ? null : Math.max(0, this.deadline - this.deps.now()),
    };
  }

  // ---------- lobby ----------

  join(conn: Conn): { playerId: string; color: Color } {
    if (this.state) throw new RoomError('started', 'This game has already started.');
    const color = JOIN_ORDER.find((c) => this.seats[c].kind === 'open');
    if (!color) throw new RoomError('full', 'This room is full.');
    const playerId = this.deps.token();
    const secret = this.deps.token();
    this.seats[color] = { kind: 'human', playerId, secret, conn };
    if (!this.hostId) this.hostId = playerId;
    conn.send({ t: 'welcome', code: this.code, playerId, secret, color });
    this.touch();
    this.broadcast();
    return { playerId, color };
  }

  resume(conn: Conn, playerId: string, secret: string): Color {
    const color = this.colorOf(playerId);
    const seat = color ? this.seats[color] : null;
    if (!color || !seat || seat.kind !== 'human' || !seat.secret || !safeEqual(seat.secret, secret)) {
      throw new RoomError('auth', 'Could not rejoin this game.');
    }
    seat.conn = conn;
    conn.send({ t: 'welcome', code: this.code, playerId, secret, color });
    this.touch();
    this.reschedule();
    return color;
  }

  setSeat(playerId: string, color: Color, kind: 'bot' | 'open', difficulty: Difficulty = 'medium') {
    this.requireHost(playerId);
    this.requireLobby();
    if (this.seats[color].kind === 'human') throw new RoomError('bad-request', 'That seat has a player.');
    this.seats[color] = kind === 'bot' ? { kind: 'bot', difficulty } : { kind: 'open' };
    this.touch();
    this.broadcast();
  }

  setRules(playerId: string, rules: Rules) {
    this.requireHost(playerId);
    this.requireLobby();
    this.rules = rules;
    this.touch();
    this.broadcast();
  }

  start(playerId: string) {
    this.requireHost(playerId);
    this.requireLobby();
    const filled = COLORS.filter((c) => this.seats[c].kind !== 'open');
    if (filled.length < 2) throw new RoomError('bad-request', 'Need at least 2 players (add a computer player).');
    this.state = createGame(
      filled.map((c) => {
        const s = this.seats[c];
        return s.kind === 'bot' ? { color: c, kind: 'bot', difficulty: s.difficulty } : { color: c, kind: 'human' };
      }),
      this.rules,
    );
    this.touch();
    this.reschedule();
  }

  // ---------- gameplay ----------

  roll(playerId: string) {
    this.requireTurn(playerId, 'roll');
    this.state = roll(this.state!, this.deps.randomInt(6) + 1);
    this.touch();
    this.reschedule();
  }

  move(playerId: string, token: number) {
    this.requireTurn(playerId, 'move');
    if (!legalMoves(this.state!).includes(token)) throw new RoomError('illegal', 'That token cannot move.');
    this.state = move(this.state!, token);
    this.touch();
    this.reschedule();
  }

  /** Player leaves for good. In a running game a computer player takes over their seat. */
  leave(playerId: string) {
    const color = this.colorOf(playerId);
    if (!color) return;
    const seat = this.seats[color];
    seat.conn?.send({ t: 'left' });
    if (this.state) {
      this.seats[color] = { kind: 'bot', difficulty: 'medium' };
      this.state = {
        ...this.state,
        players: this.state.players.map((p) => (p.color === color ? { ...p, kind: 'bot', difficulty: 'medium' } : p)),
      };
    } else {
      this.seats[color] = { kind: 'open' };
    }
    if (this.hostId === playerId) {
      const next = JOIN_ORDER.find((c) => this.seats[c].kind === 'human');
      this.hostId = next ? this.seats[next].playerId! : null;
    }
    this.touch();
    this.reschedule();
  }

  /** Socket dropped; the player may resume with their secret. */
  disconnect(conn: Conn) {
    const color = COLORS.find((c) => this.seats[c].conn === conn);
    if (!color) return;
    this.seats[color].conn = null;
    this.reschedule();
  }

  dispose() {
    if (this.timer) this.deps.clearTimeout(this.timer);
    this.timer = null;
  }

  // ---------- internals ----------

  private requireHost(playerId: string) {
    if (playerId !== this.hostId) throw new RoomError('not-host', 'Only the host can do that.');
  }

  private requireLobby() {
    if (this.state) throw new RoomError('started', 'The game has already started.');
  }

  private requireTurn(playerId: string, phase: 'roll' | 'move') {
    const s = this.state;
    if (!s || s.phase === 'over') throw new RoomError('bad-request', 'No game in progress.');
    if (currentPlayer(s).color !== this.colorOf(playerId)) throw new RoomError('not-your-turn', 'It is not your turn.');
    if (s.phase !== phase) throw new RoomError('illegal', phase === 'roll' ? 'Move a token first.' : 'Roll the dice first.');
  }

  private touch() {
    this.lastActivity = this.deps.now();
  }

  /** Cancel any pending timer, schedule the next bot/auto action, then broadcast. */
  private reschedule() {
    if (this.timer) this.deps.clearTimeout(this.timer);
    this.timer = null;
    this.deadline = null;
    const s = this.state;
    if (s && s.phase !== 'over') {
      const seat = this.seats[currentPlayer(s).color];
      if (seat.kind === 'bot') {
        this.timer = this.deps.setTimeout(() => this.autoStep(seat.difficulty ?? 'medium'), this.timing.botDelayMs);
      } else {
        const wait = seat.conn ? this.timing.turnTimeoutMs : this.timing.disconnectedTurnTimeoutMs;
        this.deadline = this.deps.now() + wait;
        this.timer = this.deps.setTimeout(() => this.autoStep('medium'), wait);
      }
    }
    this.broadcast();
  }

  private autoStep(difficulty: Difficulty) {
    this.timer = null;
    const s = this.state;
    if (!s || s.phase === 'over') return;
    this.state =
      s.phase === 'roll' ? roll(s, this.deps.randomInt(6) + 1) : move(s, chooseBotMove(s, difficulty, () => this.deps.randomInt(1_000_000) / 1_000_000));
    this.touch();
    this.reschedule();
  }

  private broadcast() {
    const room = this.view();
    for (const c of COLORS) this.seats[c].conn?.send({ t: 'room', room });
  }
}

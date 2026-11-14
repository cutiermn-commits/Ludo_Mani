import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Conn, Deps, Room, RoomError } from '../src/room';
import { ServerMessage } from '../../src/net/protocol';

/** Fake clock + scheduler so timeouts run instantly and deterministically. */
function fakeDeps(dice: number[] = []) {
  let now = 0;
  let id = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  let tok = 0;
  const deps: Deps = {
    now: () => now,
    setTimeout: (fn, ms) => {
      timers.set(++id, { at: now + ms, fn });
      return id;
    },
    clearTimeout: (h) => void timers.delete(h as number),
    randomInt: (max) => (max === 6 && dice.length ? dice.shift()! - 1 : 0),
    token: () => `token-${String(++tok).padStart(4, '0')}`,
  };
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      timers.delete(next[0]);
      now = next[1].at;
      next[1].fn();
    }
    now = end;
  };
  return { deps, advance };
}

function conn() {
  const inbox: ServerMessage[] = [];
  const c: Conn & { inbox: ServerMessage[]; last: () => any } = {
    inbox,
    send: (m) => void inbox.push(m),
    last: () => inbox.filter((m) => m.t === 'room').at(-1),
  };
  return c;
}

const timing = { botDelayMs: 10, turnTimeoutMs: 1000, disconnectedTurnTimeoutMs: 100 };

test('first joiner is host and red; second is yellow (opposite seat)', () => {
  const { deps } = fakeDeps();
  const r = new Room('ABCDEF', deps, timing);
  const a = conn(), b = conn();
  assert.equal(r.join(a).color, 'red');
  assert.equal(r.join(b).color, 'yellow');
  assert.equal(r.view().hostColor, 'red');
  assert.equal(a.inbox[0].t, 'welcome');
});

test('only the host can configure and start; need 2+ players', () => {
  const { deps } = fakeDeps();
  const r = new Room('ABCDEF', deps, timing);
  const host = r.join(conn()).playerId;
  assert.throws(() => r.start(host), (e: RoomError) => e.code === 'bad-request');
  const guest = r.join(conn()).playerId;
  assert.throws(() => r.setSeat(guest, 'green', 'bot'), (e: RoomError) => e.code === 'not-host');
  assert.throws(() => r.start(guest), (e: RoomError) => e.code === 'not-host');
  r.start(host);
  assert.ok(r.state);
  assert.throws(() => r.join(conn()), (e: RoomError) => e.code === 'started');
});

test('server rolls the dice and rejects out-of-turn and illegal actions', () => {
  const { deps } = fakeDeps([6, 3]);
  const r = new Room('ABCDEF', deps, timing);
  const red = r.join(conn()).playerId;
  const yellow = r.join(conn()).playerId;
  r.start(red);
  assert.throws(() => r.roll(yellow), (e: RoomError) => e.code === 'not-your-turn');
  assert.throws(() => r.move(red, 0), (e: RoomError) => e.code === 'illegal');
  r.roll(red); // server-chosen 6
  assert.equal(r.state!.dice, 6);
  r.move(red, 2);
  assert.equal(r.state!.players[0].tokens[2], 0);
  r.roll(red); // 3 after a 6: still red's turn
  assert.equal(r.state!.lastEvent.type, 'rolled');
});

test('idle human turn is auto-played after the timeout', () => {
  const { deps, advance } = fakeDeps([2]);
  const r = new Room('ABCDEF', deps, timing);
  const red = r.join(conn()).playerId;
  r.join(conn());
  r.start(red);
  assert.equal(r.view().turnMsLeft, 1000);
  advance(999);
  assert.equal(r.state!.current, 0);
  advance(2);
  assert.equal(r.state!.lastEvent.type, 'no-moves'); // rolled a 2 for red, no tokens out
  assert.equal(r.state!.current, 1);
});

test('disconnected player gets the short timeout and can resume with their secret', () => {
  const { deps, advance } = fakeDeps([1]);
  const r = new Room('ABCDEF', deps, timing);
  const a = conn();
  const red = r.join(a).playerId;
  const secret = (a.inbox[0] as any).secret as string;
  r.join(conn());
  r.start(red);
  r.disconnect(a);
  assert.equal(r.view().seats.find((s) => s.color === 'red')!.connected, false);
  advance(101);
  assert.equal(r.state!.current, 1, 'auto-played after short timeout');
  assert.throws(() => r.resume(conn(), red, 'wrong-secret-xxxx'), (e: RoomError) => e.code === 'auth');
  const a2 = conn();
  assert.equal(r.resume(a2, red, secret), 'red');
  assert.equal(a2.inbox[0].t, 'welcome');
});

test('a player who leaves mid-game is replaced by a computer player', () => {
  const { deps } = fakeDeps();
  const r = new Room('ABCDEF', deps, timing);
  const red = r.join(conn()).playerId;
  const yellow = r.join(conn()).playerId;
  r.start(red);
  r.leave(yellow);
  assert.equal(r.view().seats.find((s) => s.color === 'yellow')!.kind, 'bot');
  assert.equal(r.state!.players[1].kind, 'bot');
});

test('host leaving the lobby hands host to the next player', () => {
  const { deps } = fakeDeps();
  const r = new Room('ABCDEF', deps, timing);
  const red = r.join(conn()).playerId;
  r.join(conn());
  r.leave(red);
  assert.equal(r.view().hostColor, 'yellow');
  assert.equal(r.view().seats.find((s) => s.color === 'red')!.kind, 'open');
});

test('a human-vs-3-bots game runs to completion with auto-play only', () => {
  let seed = 7;
  const { deps, advance } = fakeDeps();
  deps.randomInt = (max) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % max;
  };
  const r = new Room('ABCDEF', deps, timing);
  const c = conn();
  const red = r.join(c).playerId;
  r.setSeat(red, 'green', 'bot', 'hard');
  r.setSeat(red, 'yellow', 'bot', 'easy');
  r.setSeat(red, 'blue', 'bot', 'medium');
  r.start(red);
  for (let i = 0; i < 5000 && r.state!.phase !== 'over'; i++) advance(1000);
  assert.equal(r.state!.phase, 'over');
  assert.equal(c.last().room.state.phase, 'over', 'client received the final state');
});

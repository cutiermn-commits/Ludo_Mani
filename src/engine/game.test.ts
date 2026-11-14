/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_COLUMN, TRACK, cellFor, trackIndex } from './board';
import { GameState, chooseBotMove, createGame, legalMoves, move, roll } from './game';

const twoPlayer = () =>
  createGame([
    { color: 'red', kind: 'human' },
    { color: 'yellow', kind: 'human' },
  ]);

function withTokens(s: GameState, tokens: number[][]): GameState {
  return { ...s, players: s.players.map((p, i) => ({ ...p, tokens: tokens[i] ?? p.tokens })) };
}

test('track has 52 unique cells and home columns do not overlap it', () => {
  const keys = new Set(TRACK.map(([x, y]) => `${x},${y}`));
  assert.equal(keys.size, 52);
  for (const col of Object.values(HOME_COLUMN)) for (const [x, y] of col) assert.ok(!keys.has(`${x},${y}`));
});

test('consecutive track cells are orthogonally adjacent (except corner diagonal hops)', () => {
  for (let i = 0; i < 52; i++) {
    const [ax, ay] = TRACK[i];
    const [bx, by] = TRACK[(i + 1) % 52];
    const d = Math.abs(ax - bx) + Math.abs(ay - by);
    assert.ok(d === 1 || (d === 2 && ax !== bx && ay !== by), `gap between ${i} and ${i + 1}`);
  }
});

test('last track square of each colour is adjacent to the first home column cell', () => {
  for (const c of ['red', 'green', 'yellow', 'blue'] as const) {
    const [ax, ay] = cellFor(c, 0, 50);
    const [bx, by] = cellFor(c, 0, 51);
    assert.equal(Math.abs(ax - bx) + Math.abs(ay - by), 1, c);
  }
});

test('a token cannot leave base without a 6', () => {
  const s = roll(twoPlayer(), 3);
  assert.equal(s.current, 1, 'turn passes when no moves');
  assert.equal(s.lastEvent.type, 'no-moves');
});

test('rolling 6 lets a token leave base and grants another roll', () => {
  let s = roll(twoPlayer(), 6);
  assert.deepEqual(legalMoves(s), [0, 1, 2, 3]);
  s = move(s, 0);
  assert.equal(s.players[0].tokens[0], 0);
  assert.equal(s.current, 0);
  assert.equal(s.phase, 'roll');
});

test('three sixes in a row forfeits the turn', () => {
  let s = twoPlayer();
  s = move(roll(s, 6), 0);
  s = move(roll(s, 6), 0);
  s = roll(s, 6);
  assert.equal(s.lastEvent.type, 'forfeit');
  assert.equal(s.current, 1);
});

test('capturing sends the opponent home and grants a bonus roll', () => {
  let s = twoPlayer();
  // Red token at progress 10 (abs 10). Yellow token at abs 12 => yellow progress (12 - 26 + 52) % 52 = 38.
  s = withTokens(s, [[10, -1, -1, -1], [38, -1, -1, -1]]);
  s = move(roll(s, 2), 0);
  assert.equal(trackIndex('red', s.players[0].tokens[0]), 12);
  assert.equal(s.players[1].tokens[0], -1);
  assert.equal(s.current, 0, 'bonus roll');
});

test('no capture on a safe square', () => {
  let s = twoPlayer();
  // Abs 8 is a star square. Yellow progress for abs 8 = (8 - 26 + 52) % 52 = 34.
  s = withTokens(s, [[5, -1, -1, -1], [34, -1, -1, -1]]);
  s = move(roll(s, 3), 0);
  assert.equal(s.players[1].tokens[0], 34);
  assert.equal(s.current, 1);
});

test('exact roll is required to finish', () => {
  let s = withTokens(twoPlayer(), [[54, 56, 56, 56], [-1, -1, -1, -1]]);
  s = roll(s, 3);
  assert.equal(s.lastEvent.type, 'no-moves');
  s = withTokens({ ...s, current: 0 }, [[54, 56, 56, 56]]);
  s = move(roll(s, 2), 0);
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, 'red');
});

test('bots can play a full 4-player game to completion', () => {
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) % 6) + 1;
  let s = createGame([
    { color: 'red', kind: 'bot' },
    { color: 'green', kind: 'bot' },
    { color: 'yellow', kind: 'bot' },
    { color: 'blue', kind: 'bot' },
  ]);
  let steps = 0;
  while (s.phase !== 'over' && steps++ < 20000) {
    s = s.phase === 'roll' ? roll(s, rand()) : move(s, chooseBotMove(s));
  }
  assert.equal(s.phase, 'over');
  assert.ok(s.winner);
});

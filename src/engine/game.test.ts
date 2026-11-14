/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_COLUMN, TRACK, cellFor, trackIndex } from './board';
import { chooseBotMove } from './ai';
import { Difficulty, GameState, createGame, legalMoves, move, roll } from './game';

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

function winRate(a: Difficulty, b: Difficulty, games: number): number {
  let wins = 0;
  for (let i = 0; i < games; i++) {
    const rng = lcg(i + 1);
    const [ca, cb] = i % 2 ? (['yellow', 'red'] as const) : (['red', 'yellow'] as const);
    let s = createGame([
      { color: ca, kind: 'bot', difficulty: a },
      { color: cb, kind: 'bot', difficulty: b },
    ]);
    while (s.phase !== 'over') {
      s = s.phase === 'roll' ? roll(s, 1 + Math.floor(rng() * 6)) : move(s, chooseBotMove(s, s.players[s.current].difficulty, rng));
    }
    if (s.winner === ca) wins++;
  }
  return wins / games;
}

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
  const rand01 = lcg(42);
  const rand = () => 1 + Math.floor(rand01() * 6);
  let s = createGame([
    { color: 'red', kind: 'bot' },
    { color: 'green', kind: 'bot', difficulty: 'easy' },
    { color: 'yellow', kind: 'bot', difficulty: 'hard' },
    { color: 'blue', kind: 'bot' },
  ]);
  let steps = 0;
  while (s.phase !== 'over' && steps++ < 20000) {
    s = s.phase === 'roll' ? roll(s, rand()) : move(s, chooseBotMove(s, s.players[s.current].difficulty, rand01));
  }
  assert.equal(s.phase, 'over');
  assert.ok(s.winner);
});

test('difficulty levels are ordered by strength (seeded, 600 games each)', () => {
  const hardVsEasy = winRate('hard', 'easy', 600);
  const mediumVsEasy = winRate('medium', 'easy', 600);
  const hardVsMedium = winRate('hard', 'medium', 600);
  assert.ok(hardVsEasy > 0.75, `hard vs easy ${hardVsEasy}`);
  assert.ok(mediumVsEasy > 0.7, `medium vs easy ${mediumVsEasy}`);
  assert.ok(hardVsMedium > 0.5, `hard vs medium ${hardVsMedium}`);
});

test('bots are created with a default difficulty, humans without', () => {
  const s = createGame([
    { color: 'red', kind: 'human' },
    { color: 'blue', kind: 'bot' },
  ]);
  assert.equal(s.players[0].difficulty, undefined);
  assert.equal(s.players[1].difficulty, 'medium');
});

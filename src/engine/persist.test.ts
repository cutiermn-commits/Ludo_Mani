/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseBotMove } from './ai';
import { createGame, move, roll } from './game';
import { deserialize, serialize } from './persist';

const fresh = () =>
  createGame([
    { color: 'red', kind: 'human' },
    { color: 'yellow', kind: 'bot', difficulty: 'hard' },
  ]);

test('a game round-trips through save/load and keeps playing', () => {
  let s = move(roll(fresh(), 6), 0); // red out, red to roll again
  const env = deserialize(serialize(s, 123));
  assert.ok(env);
  assert.equal(env!.savedAt, 123);
  assert.deepEqual(env!.state, s);
  s = roll(env!.state, 4);
  assert.equal(s.players[0].tokens[0], 0);
  s = move(s, chooseBotMove(s, 'medium'));
  assert.equal(s.players[0].tokens[0], 4);
});

test('a game saved mid-move (dice rolled, token not moved) resumes in the move phase', () => {
  const s = roll(fresh(), 6);
  const env = deserialize(serialize(s, 1))!;
  assert.equal(env.state.phase, 'move');
  assert.equal(env.state.dice, 6);
});

test('finished games are not offered for resume', () => {
  const s = { ...fresh(), phase: 'over' as const, winner: 'red' as const };
  assert.equal(deserialize(serialize(s, 1)), null);
});

test('corrupt, tampered or old-version saves are rejected', () => {
  const good = JSON.parse(serialize(fresh(), 1));
  const bad = (mut: (x: any) => void) => {
    const c = structuredClone(good);
    mut(c);
    return JSON.stringify(c);
  };
  assert.equal(deserialize(null), null);
  assert.equal(deserialize('not json'), null);
  assert.equal(deserialize(bad((x) => (x.v = 99))), null);
  assert.equal(deserialize(bad((x) => (x.state.players[0].tokens[0] = 99))), null);
  assert.equal(deserialize(bad((x) => (x.state.players[0].tokens = [0, 0]))), null);
  assert.equal(deserialize(bad((x) => (x.state.players[1].color = 'red'))), null);
  assert.equal(deserialize(bad((x) => (x.state.players[0].kind = 'admin'))), null);
  assert.equal(deserialize(bad((x) => (x.state.current = 5))), null);
  assert.equal(deserialize(bad((x) => (x.state.phase = 'move'))), null); // move phase without dice
  assert.equal(deserialize(bad((x) => delete x.state.rules.homeBonus)), null);
  // move phase with a dice value but no legal move would be a stuck game
  assert.equal(deserialize(bad((x) => ((x.state.phase = 'move'), (x.state.dice = 3)))), null);
});

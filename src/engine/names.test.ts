/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, move, roll } from './game';
import { BOT_NAMES, botName, isAllowedName, isKnownName, randomName } from './names';
import { deserialize, serialize } from './persist';
import { commentary, displayName } from './quips';

test('random names are always allowed and avoid duplicates', () => {
  for (let i = 0; i < 200; i++) assert.ok(isAllowedName(randomName()));
  const seq = (vals: number[]) => {
    let i = 0;
    return () => vals[i++ % vals.length];
  };
  const first = randomName(seq([0, 0]));
  assert.equal(first, 'Lucky Llama');
  // Same first pick is skipped when it must be avoided.
  assert.notEqual(randomName(seq([0, 0, 0.5, 0.5]), [first]), first);
});

test('free text is never an allowed name', () => {
  for (const bad of ['', 'Lucky', 'Lucky  Llama', 'lucky llama', 'Lucky Llama!', 'Bad Word', 'Lucky Llama Extra', 42, null, '<script>'])
    assert.equal(isAllowedName(bad), false, String(bad));
  assert.equal(isAllowedName('Lucky Llama'), true);
});

test('bot names are known but not choosable by players', () => {
  const b = botName('hard');
  assert.ok((BOT_NAMES.hard as readonly string[]).includes(b));
  assert.equal(isAllowedName(b), false);
  assert.equal(isKnownName(b), true);
});

test('names survive save/load; unknown names make a save invalid', () => {
  const s = createGame([
    { color: 'red', kind: 'human', name: 'Lucky Llama' },
    { color: 'yellow', kind: 'bot', difficulty: 'hard', name: 'The Dicetator' },
  ]);
  assert.equal(deserialize(serialize(s, 1))!.state.players[0].name, 'Lucky Llama');
  const tampered = JSON.parse(serialize(s, 1));
  tampered.state.players[0].name = 'Something Rude';
  assert.equal(deserialize(JSON.stringify(tampered)), null);
});

test('commentary uses player names, not colours', () => {
  let s = createGame([
    { color: 'red', kind: 'human', name: 'Lucky Llama' },
    { color: 'yellow', kind: 'bot', name: 'Captain Dice' },
  ]);
  s = roll(s, 6);
  assert.match(commentary(s.lastEvent, s).text, /Lucky Llama/);
  s = move(s, 0);
  assert.match(commentary(s.lastEvent, s).text, /Lucky Llama/);
  // Capture: red at progress 10 (abs 10), yellow at abs 12 (yellow progress 38)
  s = { ...s, players: [{ ...s.players[0], tokens: [10, -1, -1, -1] }, { ...s.players[1], tokens: [38, -1, -1, -1] }] };
  s = move(roll(s, 2), 0);
  const c = commentary(s.lastEvent, s);
  assert.match(c.text, /Lucky Llama/);
  assert.match(c.text, /Captain Dice/);
  assert.ok(c.toast);
  assert.equal(displayName({ color: 'blue' }), 'Blue');
});

test('no-move jokes fit the situation (in base vs. needing an exact roll)', () => {
  const base = createGame([
    { color: 'red', kind: 'human', name: 'Lucky Llama' },
    { color: 'yellow', kind: 'human', name: 'Sleepy Sloth' },
  ]);
  const inBase = roll(base, 3);
  const nearHome = roll({ ...base, players: [{ ...base.players[0], tokens: [56, 56, 56, 55] }, base.players[1]] }, 6);
  for (let i = 0; i < 30; i++) {
    const r = () => (i + 0.5) / 30;
    assert.doesNotMatch(commentary(nearHome.lastEvent, nearHome, r).text, /needed a 6|waiting for that 6/);
  }
  assert.ok(['needed a 6', 'void', 'waiting for that 6', 'passes the dice'].some((k) => commentary(inBase.lastEvent, inBase).text.includes(k)));
});

// Light-hearted commentary for game events. Pure functions: pass an rng to make
// the choice reproducible. `{n}` = acting player, `{v}` = dice value, `{m}` = captured player(s).

import { Color, FINISHED, IN_BASE } from './board';
import { GameEvent, GameState, Player } from './game';
import { Rng } from './names';

export const COLOR_LABEL: Record<Color, string> = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' };

export function displayName(p: Pick<Player, 'name' | 'color'>): string {
  return p.name ?? COLOR_LABEL[p.color];
}

const LINES = {
  six: [
    '{n} rolled a 6! Show-off. 😎',
    'A 6 for {n}! The dice clearly have favourites.',
    '{n} rolls a 6 and does a little victory dance. 💃',
    '6! {n} is feeling dangerous.',
  ],
  roll: [
    '{n} rolled a {v}.',
    '{n} rolled a {v}. Choose wisely…',
    '{v} for {n}. Could be worse!',
    '{n} rolled a {v}. Time to make a move.',
  ],
  // No move possible because every remaining token is still in base.
  noMovesBase: [
    '{n} rolled a {v}… and stared into the void. 🫠',
    'A {v}? {n} needed a 6. The dice are not listening.',
    '{n} rolled a {v}. Still waiting for that 6… 🙏',
    '{n} rolled a {v} and politely passes the dice.',
  ],
  // No move possible because tokens near home need an exact roll.
  noMovesExact: [
    '{n} rolled a {v}, but home needs the exact number. So close! 🤏',
    'A {v} is too much! {n} must land exactly in the centre.',
    '{n} rolled a {v}. Nothing to do but sigh dramatically.',
    '{n} overshoots with a {v}. Patience is a virtue! 🧘',
  ],
  forfeit: [
    'Three 6s! {n} got too greedy. Turn over! 🙈',
    '6, 6, 6… the dice called the police on {n}. 🚓',
    '{n} rolled three 6s and lost the turn. Ouch!',
  ],
  capture: [
    '{n} sent {m} home packing! 🏠💨',
    'BOOM! {n} knocked out {m}. 🥊',
    '{m} got bonked by {n}. Back to base! 😵',
    '{n} says "sorry not sorry" to {m}. 😈',
  ],
  home: [
    '{n} got a token home! 🎉',
    'Token safely home for {n}. Fancy! ✨',
    '{n} parks a token in the centre. Nice driving! 🚗',
  ],
  moved: ['{n} moved.', '{n} makes a move.', '{n} shuffles along.', '{n} tiptoes forward.'],
  win: [
    '{n} wins! 🏆 Bow down, everyone.',
    '{n} is the Ludo champion! 👑',
    '{n} wins! Rematch? Or are you scared? 😏',
  ],
  start: ['Let the games begin! Roll a 6 to bring a token out. 🎲', 'Game on! You need a 6 to get started. 🎲'],
} as const;

const pick = (arr: readonly string[], rng: Rng) => arr[Math.floor(rng() * arr.length) % arr.length];

function fill(line: string, vars: Record<string, string>) {
  return line.replace(/\{(\w)\}/g, (_, k) => vars[k] ?? '');
}

function nameOf(state: GameState, color: Color): string {
  const p = state.players.find((x) => x.color === color);
  return p ? displayName(p) : COLOR_LABEL[color];
}

function joinNames(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export interface Commentary {
  /** One-line status text. */
  text: string;
  /** Short headline for a pop-up toast on big moments, if any. */
  toast?: string;
}

export function commentary(e: GameEvent, state: GameState, rng: Rng = Math.random): Commentary {
  switch (e.type) {
    case 'start':
      return { text: pick(LINES.start, rng) };
    case 'rolled':
      return { text: fill(pick(e.value === 6 ? LINES.six : LINES.roll, rng), { n: nameOf(state, e.color), v: String(e.value) }) };
    case 'no-moves': {
      const p = state.players.find((x) => x.color === e.color);
      const allInBase = !!p && p.tokens.every((t) => t === IN_BASE || t === FINISHED);
      return { text: fill(pick(allInBase ? LINES.noMovesBase : LINES.noMovesExact, rng), { n: nameOf(state, e.color), v: String(e.value) }) };
    }
    case 'forfeit':
      return { text: fill(pick(LINES.forfeit, rng), { n: nameOf(state, e.color) }), toast: '🙈 Three 6s!' };
    case 'moved': {
      const n = nameOf(state, e.color);
      if (e.captured.length) {
        const m = joinNames([...new Set(e.captured.map((c) => nameOf(state, c.color)))]);
        return { text: fill(pick(LINES.capture, rng), { n, m }), toast: '💥 Captured!' };
      }
      if (e.finished) return { text: fill(pick(LINES.home, rng), { n }), toast: '🏠 Home!' };
      return { text: fill(pick(LINES.moved, rng), { n }) };
    }
    case 'win':
      return { text: fill(pick(LINES.win, rng), { n: nameOf(state, e.color) }), toast: '🏆 Winner!' };
  }
}

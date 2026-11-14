// Curated, family-friendly player names. Players can only pick from these
// (no free text), so names are never user-generated content.
// The server validates names against the same lists.

export const ADJECTIVES = [
  'Lucky', 'Sneaky', 'Wobbly', 'Mighty', 'Sleepy', 'Turbo', 'Fancy', 'Grumpy', 'Jolly', 'Clumsy',
  'Brave', 'Cheeky', 'Dizzy', 'Fluffy', 'Giggly', 'Happy', 'Jumpy', 'Lazy', 'Mystic', 'Noisy',
  'Peppy', 'Quirky', 'Rowdy', 'Silly', 'Speedy', 'Spicy', 'Tiny', 'Wacky', 'Zippy', 'Bouncy',
] as const;

export const NOUNS = [
  'Llama', 'Panda', 'Penguin', 'Mango', 'Pickle', 'Dragon', 'Potato', 'Ninja', 'Walrus', 'Noodle',
  'Otter', 'Koala', 'Taco', 'Wizard', 'Muffin', 'Yak', 'Hedgehog', 'Pirate', 'Dumpling', 'Badger',
  'Samosa', 'Tiger', 'Parrot', 'Cupcake', 'Goose', 'Unicorn', 'Robot', 'Banana', 'Sloth', 'Gecko',
] as const;

/** Computer player names, by difficulty. Server-assigned, never chosen by users. */
export const BOT_NAMES = {
  easy: ['Robo Rookie', 'Beep Boop', 'Dicey Dan', 'Wobblebot'],
  medium: ['Captain Dice', 'Sir Rolls-a-Lot', 'Lady Luck', 'Count Sixula'],
  hard: ['The Dicetator', 'Grandmaster Bot', 'Six Machine', 'Professor Pawn'],
} as const;

export type Rng = () => number;

const pick = <T,>(arr: readonly T[], rng: Rng): T => arr[Math.floor(rng() * arr.length) % arr.length];

export function randomName(rng: Rng = Math.random, avoid: string[] = []): string {
  for (let i = 0; i < 20; i++) {
    const n = `${pick(ADJECTIVES, rng)} ${pick(NOUNS, rng)}`;
    if (!avoid.includes(n)) return n;
  }
  // Unlucky rng: walk the list for the first free name (900 combinations, at most 4 are taken).
  for (const a of ADJECTIVES) for (const n of NOUNS) if (!avoid.includes(`${a} ${n}`)) return `${a} ${n}`;
  return `${pick(ADJECTIVES, rng)} ${pick(NOUNS, rng)}`;
}

export function botName(difficulty: 'easy' | 'medium' | 'hard', rng: Rng = Math.random, avoid: string[] = []): string {
  const options = BOT_NAMES[difficulty].filter((n) => !avoid.includes(n));
  return pick(options.length ? options : BOT_NAMES[difficulty], rng);
}

/** True only for "<Adjective> <Noun>" built from the curated lists. */
export function isAllowedName(s: unknown): s is string {
  if (typeof s !== 'string' || s.length > 24) return false;
  const parts = s.split(' ');
  return parts.length === 2 && (ADJECTIVES as readonly string[]).includes(parts[0]) && (NOUNS as readonly string[]).includes(parts[1]);
}

/** Any name that may legitimately appear in a game: a player name or a bot name. */
export function isKnownName(s: unknown): s is string {
  return isAllowedName(s) || (typeof s === 'string' && Object.values(BOT_NAMES).some((l) => (l as readonly string[]).includes(s)));
}

/**
 * The avatar's little reactions (owner request 2026-11-19: "dynamic, graphical reactions —
 * dancing, smiling, humour"). Pure data + picking, no UI. Every line is about the clothes or
 * fun, never about her body or looks (CLAUDE.md non-negotiable 1); the texts live in i18n.
 */
export type Move = 'dance' | 'twirl' | 'jump' | 'giggle' | 'pop' | 'shake';
export type Face = 'smile' | 'grin' | 'laugh' | 'wow' | 'wink' | 'oops';

export interface Reaction {
  move: Move;
  face: Face;
  /** Emoji that float up around her. */
  burst: string[];
  /** i18n key of what she says. */
  say: string;
}

/** Why she reacts. */
export type Cue = 'wear' | 'clear' | 'tap' | 'wash' | 'hello';

const POOLS: Record<Cue, Omit<Reaction, 'say'>[]> = {
  wear: [
    { move: 'dance', face: 'grin', burst: ['✨', '💖', '🎶'] },
    { move: 'twirl', face: 'laugh', burst: ['🌟', '✨', '💫'] },
    { move: 'jump', face: 'wow', burst: ['🎉', '⭐', '✨'] },
    { move: 'pop', face: 'wink', burst: ['💖', '✨'] },
  ],
  clear: [{ move: 'giggle', face: 'grin', burst: ['🫧', '✨'] }],
  tap: [
    { move: 'giggle', face: 'laugh', burst: ['😂', '✨'] },
    { move: 'jump', face: 'wow', burst: ['⭐', '💫'] },
    { move: 'dance', face: 'grin', burst: ['🎶', '🎵', '✨'] },
    { move: 'twirl', face: 'wink', burst: ['🌈', '✨'] },
  ],
  wash: [{ move: 'shake', face: 'oops', burst: ['🫧', '🫧', '🧼'] }],
  hello: [{ move: 'pop', face: 'grin', burst: ['👋', '✨'] }],
};

/** How many lines each cue has in i18n: `react.<cue>.<n>`, n = 1…count. */
export const LINES: Record<Cue, number> = { wear: 8, clear: 2, tap: 6, wash: 2, hello: 3 };

/**
 * A reaction for this cue. `rnd` is injectable for tests; `last` avoids saying the same line
 * twice in a row.
 */
export function pickReaction(cue: Cue, rnd: () => number = Math.random, last?: string): Reaction {
  const pool = POOLS[cue];
  const base = pool[Math.floor(rnd() * pool.length) % pool.length];
  const n = LINES[cue];
  let i = (Math.floor(rnd() * n) % n) + 1;
  if (n > 1 && `react.${cue}.${i}` === last) i = (i % n) + 1;
  return { ...base, say: `react.${cue}.${i}` };
}

/** Every i18n key the reactions can use (the i18n test checks they all exist in DA and EN). */
export const REACTION_KEYS: string[] = (Object.keys(LINES) as Cue[]).flatMap((c) => Array.from({ length: LINES[c] }, (_, i) => `react.${c}.${i + 1}`));

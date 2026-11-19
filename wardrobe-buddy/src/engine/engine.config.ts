/**
 * Outfit engine configuration.
 *
 * EVERY number in this file is an ASSUMPTION / starting value taken from
 * docs/OUTFIT_ENGINE.md, or a documented interpretation of it (see the
 * comment on each value and docs/DECISIONS.md D-015…D-022). Tune here only;
 * tests import these values instead of repeating them.
 */
import type { ColorName, Mood, StyleTag, Subcategory } from '@/domain/types';

export type BandName = 'hot' | 'mild' | 'cool' | 'cold' | 'freezing';

export interface Band {
  name: BandName;
  /** Inclusive lower bound of feels-like °C. */
  minFeelsC: number;
  /** Target warmth sum (top + bottom + outer; dress counts double). */
  targetMin: number;
  targetMax: number;
  /** Outerwear is part of the outfit in this band even without rain. */
  needsOuterwear: boolean;
}

/** OUTFIT_ENGINE §1. Ordered warmest → coldest. ASSUMPTION. */
export const BANDS: readonly Band[] = [
  { name: 'hot', minFeelsC: 22, targetMin: 2, targetMax: 4, needsOuterwear: false },
  { name: 'mild', minFeelsC: 16, targetMin: 4, targetMax: 6, needsOuterwear: false },
  { name: 'cool', minFeelsC: 10, targetMin: 6, targetMax: 8, needsOuterwear: true },
  { name: 'cold', minFeelsC: 3, targetMin: 8, targetMax: 11, needsOuterwear: true },
  // "11+": capped at 15 (= 5 + 5 + 5), the maximum a top+bottom+outer can reach.
  { name: 'freezing', minFeelsC: -Infinity, targetMin: 11, targetMax: 15, needsOuterwear: true },
];

export const ENGINE_CONFIG = {
  /** School hours used to summarise the day (local time, inclusive start, exclusive end). D-016. */
  schoolHours: { start: 8, end: 15 },
  /** Day swing that triggers "layers" tip. §1 */
  layersSwingC: 8,
  /** Hard rule tolerance: warmth sum must be within band ± this. §3 */
  warmthTolerance: 1,
  /** A dress replaces top + bottom, so its warmth counts this many times. D-017 */
  dressWarmthMultiplier: 2,
  /** Combination cap (§3: "around 300"). Lists are pre-ranked before trimming. */
  maxCombinations: 300,
  /** Number of suggestions returned: 1 main + 2 alternatives. §4 */
  suggestionCount: 3,

  rain: { chancePct: 50, mm: 1 },
  windyKmh: 30,
  hatGlovesBelowC: 5,
  scarfBelowC: 0,
  lipBalmBelowC: 3,
  /** "windy and cold": cold band upper edge. ASSUMPTION */
  windyColdBelowC: 10,
  uv: { sunscreen: 3, cap: 6 },

  weights: {
    weather: 0.35,
    taste: 0.25,
    mood: 0.15,
    variety: 0.15,
    color: 0.1,
  },
  /** Weather fit falls to 0 at this distance (warmth points) from the band. ASSUMPTION */
  weatherFitFalloff: 4,
  /** Penalties inside weather fit. ASSUMPTION */
  notWindproofPenalty: 0.2,
  snowShoesPenalty: 0.2,
  /** Taste: bonus share for favourites. ASSUMPTION */
  favoriteBonus: 0.2,
  /** Variety: look-back window in days (§4: "last 3 days"). */
  varietyDays: 3,
  /** Colour harmony. ASSUMPTION */
  maxBoldColors: 2,
  tooManyBoldPenalty: 0.5,
  dislikedColorPenalty: 0.5,
  likedColorBonus: 0.2,
  colorBase: 0.8,
  /** Neutral mood score when no mood is picked. */
  noMoodScore: 0.5,

  learning: {
    alpha: 0.2,
    weightMin: -1,
    weightMax: 1,
    tempStepC: 0.5,
    tempMinC: -4,
    tempMaxC: 4,
    woreBonus: 0.1,
    tagStep: 0.1,
    /** Thresholds for the plain-words summary in Me. ASSUMPTION */
    runsColdAtC: -1,
    runsWarmAtC: 1,
    likedItemAt: 0.2,
    likedTagAt: 0.15,
  },
} as const;

/** Colours that go with anything. ASSUMPTION */
export const NEUTRAL_COLORS: readonly ColorName[] = ['black', 'white', 'grey', 'beige', 'brown', 'navy', 'denim'];
/** Colours counted as "bold". ASSUMPTION */
export const BOLD_COLORS: readonly ColorName[] = ['red', 'orange', 'yellow', 'pink', 'purple', 'green', 'multi'];

/** Mood → style tags (and subcategories) it likes. §4. ASSUMPTION */
export const MOOD_MATCH: Record<Mood, { tags: readonly StyleTag[]; subcategories: readonly Subcategory[] }> = {
  happy: { tags: ['bright', 'casual'], subcategories: [] },
  cozy: { tags: ['cozy', 'comfy'], subcategories: ['hoodie', 'sweater', 'cardigan'] },
  sporty: { tags: ['sporty'], subcategories: ['leggings', 'sneakers', 'hoodie'] },
  fancy: { tags: ['fancy'], subcategories: ['dress', 'skirt', 'shirt'] },
  chill: { tags: ['casual', 'comfy'], subcategories: ['tshirt', 'jeans'] },
};

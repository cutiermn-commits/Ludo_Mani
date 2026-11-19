import type { ClothingItem, ColorName, LearningState, Mood, WeatherDay } from '@/domain/types';

import { BOLD_COLORS, ENGINE_CONFIG as C, MOOD_MATCH, type Band } from './engine.config';
import { clamp, daysBetween } from './hash';
import { isWindy } from './weather';

export interface Combo {
  /** Dress, or top + bottom. */
  main: ClothingItem[];
  shoes?: ClothingItem;
  outer?: ClothingItem;
}

export interface FactorScores {
  weather: number;
  taste: number;
  mood: number;
  variety: number;
  color: number;
}
export type FactorName = keyof FactorScores;

export interface ScoreContext {
  date: string;
  band: Band;
  day: WeatherDay;
  mood?: Mood;
  likedColors: readonly ColorName[];
  dislikedColors: readonly ColorName[];
  learning: LearningState;
  /** Item ids worn per date (history), used for variety. */
  history: readonly { date: string; itemIds: readonly string[] }[];
  /** Items already planned on other days this week. */
  plannedItemIds: ReadonlySet<string>;
}

export function comboItems(c: Combo): ClothingItem[] {
  return [...c.main, ...(c.outer ? [c.outer] : []), ...(c.shoes ? [c.shoes] : [])];
}

export function itemWarmth(item: ClothingItem): number {
  return item.category === 'dress' ? item.warmth * C.dressWarmthMultiplier : item.warmth;
}

/** Warmth sum = top + bottom + outer (dress counts double). Shoes excluded (§1). */
export function warmthSum(c: Combo): number {
  return c.main.reduce((s, i) => s + itemWarmth(i), 0) + (c.outer ? c.outer.warmth : 0);
}

/** Distance in warmth points from the band's target range (0 inside it). */
export function bandDistance(sum: number, band: Band): number {
  if (sum < band.targetMin) return band.targetMin - sum;
  if (sum > band.targetMax) return sum - band.targetMax;
  return 0;
}

export function weatherFit(c: Combo, ctx: ScoreContext): number {
  let s = 1 - bandDistance(warmthSum(c), ctx.band) / C.weatherFitFalloff;
  if (isWindy(ctx.day) && c.outer && !c.outer.windproof) s -= C.notWindproofPenalty;
  if (ctx.day.snow && c.shoes && !c.shoes.waterproof) s -= C.snowShoesPenalty;
  return clamp(s, 0, 1);
}

function tagWeight(item: ClothingItem, l: LearningState): number {
  if (item.styleTags.length === 0) return 0;
  return item.styleTags.reduce((s, t) => s + (l.tagWeights[t] ?? 0), 0) / item.styleTags.length;
}

export function tasteScore(c: Combo, ctx: ScoreContext): number {
  const items = comboItems(c);
  const w = items.reduce((s, i) => s + (ctx.learning.itemWeights[i.id] ?? 0) + tagWeight(i, ctx.learning) / 2, 0) / items.length;
  const fav = items.filter((i) => i.favorite).length / items.length;
  return clamp((w + 1) / 2 + C.favoriteBonus * fav, 0, 1);
}

export function moodScore(c: Combo, mood: Mood | undefined): number {
  if (!mood) return C.noMoodScore;
  const m = MOOD_MATCH[mood];
  const relevant = [...c.main, ...(c.outer ? [c.outer] : [])];
  const hits = relevant.filter(
    (i) => i.styleTags.some((t) => m.tags.includes(t)) || (i.subcategory !== undefined && m.subcategories.includes(i.subcategory)),
  ).length;
  return hits / relevant.length;
}

/**
 * Variety: share of main pieces (top/bottom/dress) not worn in the last N days and not planned elsewhere this week.
 * Shoes and outerwear are re-worn daily in real life, so they are not penalised (D-019).
 */
export function varietyScore(c: Combo, ctx: ScoreContext): number {
  const recent = new Set<string>();
  for (const h of ctx.history) {
    const d = daysBetween(h.date, ctx.date);
    if (d >= 1 && d <= C.varietyDays) h.itemIds.forEach((id) => recent.add(id));
  }
  const repeated = c.main.filter((i) => recent.has(i.id) || ctx.plannedItemIds.has(i.id)).length;
  return 1 - repeated / c.main.length;
}

export function colorScore(c: Combo, ctx: ScoreContext): number {
  const items = comboItems(c);
  const colors = items.flatMap((i) => i.colors);
  let s = C.colorBase;
  const bold = new Set(colors.filter((col) => BOLD_COLORS.includes(col)));
  if (bold.size > C.maxBoldColors) s -= C.tooManyBoldPenalty;
  const disliked = items.filter((i) => i.colors.some((col) => ctx.dislikedColors.includes(col))).length;
  s -= C.dislikedColorPenalty * disliked;
  if (colors.some((col) => ctx.likedColors.includes(col))) s += C.likedColorBonus;
  return clamp(s, 0, 1);
}

export function scoreCombo(c: Combo, ctx: ScoreContext): { total: number; factors: FactorScores } {
  const factors: FactorScores = {
    weather: weatherFit(c, ctx),
    taste: tasteScore(c, ctx),
    mood: moodScore(c, ctx.mood),
    variety: varietyScore(c, ctx),
    color: colorScore(c, ctx),
  };
  const W = C.weights;
  const total =
    W.weather * factors.weather + W.taste * factors.taste + W.mood * factors.mood + W.variety * factors.variety + W.color * factors.color;
  return { total, factors };
}

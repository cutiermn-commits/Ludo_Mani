import type { ClothingItem, ColorName, ExtraKind, LearningState, Mood, StylePref, WeatherDay } from '@/domain/types';

import { ENGINE_CONFIG as C, type BandName } from './engine.config';
import { extrasFor } from './extras';
import { hashString } from './hash';
import { bandDistance, comboItems, scoreCombo, warmthSum, type Combo, type FactorName, type FactorScores, type ScoreContext } from './scoring';
import { bandFor, effectiveFeels, isRainy, isWindy } from './weather';

export interface SuggestInput {
  /** The day being dressed for, YYYY-MM-DD. Also the deterministic seed. */
  date: string;
  items: readonly ClothingItem[];
  profile: {
    stylePref: StylePref;
    likedColors: readonly ColorName[];
    dislikedColors: readonly ColorName[];
    tempOffsetC: number;
  };
  /** null = no forecast and no manual answer yet. */
  weather: WeatherDay | null;
  mood?: Mood;
  history?: readonly { date: string; itemIds: readonly string[] }[];
  plannedItemIds?: readonly string[];
  learning: LearningState;
}

/** Machine-readable reasons; the UI turns them into kid-friendly words. Never body-related. */
export type Reason =
  | { kind: 'weather'; band: BandName; feelsC: number; rainy: boolean; windy: boolean }
  | { kind: 'taste'; itemId: string; favorite: boolean }
  | { kind: 'mood'; mood: Mood }
  | { kind: 'variety' }
  | { kind: 'colors' };

export type Tip =
  | 'needWeather'
  | 'emptyWardrobe'
  | 'allInLaundry'
  | 'addTopsAndBottoms'
  | 'addOuterwear'
  | 'addRainJacket'
  | 'addShoes'
  | 'addWarmerClothes'
  | 'addLighterClothes';

export interface Suggestion {
  itemIds: string[];
  /** Id of the main piece (dress or top), used to keep alternatives different. */
  mainId: string;
  score: number;
  factors: FactorScores;
  warmth: number;
  reasons: Reason[];
}

export interface SuggestResult {
  status: 'ok' | 'empty' | 'needWeather';
  band?: BandName;
  feelsC?: number;
  outfits: Suggestion[];
  extras: ExtraKind[];
  tips: Tip[];
}

const isSkirt = (i: ClothingItem) => i.subcategory === 'skirt';

/** Applies the "choose your style" filter, falling back to everything if it would leave nothing to wear (D-018). */
function styleFilter(items: ClothingItem[], pref: StylePref): ClothingItem[] {
  if (pref !== 'trousers') return items;
  const filtered = items.filter((i) => i.category !== 'dress' && !isSkirt(i));
  const hasMain = filtered.some((i) => i.category === 'top') && filtered.some((i) => i.category === 'bottom');
  return hasMain ? filtered : items;
}

/** Trim the largest list (lowest-ranked items last) until the combination count is under the cap. */
function trimToCap(lists: ClothingItem[][], rank: (i: ClothingItem) => number, count: () => number): void {
  lists.forEach((l) => l.sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id)));
  while (count() > C.maxCombinations) {
    const largest = lists.reduce((a, b) => (b.length > a.length ? b : a));
    if (largest.length <= 1) break;
    largest.pop();
  }
}

export function suggest(input: SuggestInput): SuggestResult {
  const tips: Tip[] = [];
  if (input.items.length === 0) return { status: 'empty', outfits: [], extras: [], tips: ['emptyWardrobe'] };
  if (!input.weather) return { status: 'needWeather', outfits: [], extras: [], tips: ['needWeather'] };

  const day = input.weather;
  const feelsC = effectiveFeels(day, input.profile.tempOffsetC, input.learning.tempOffsetC);
  const band = bandFor(feelsC);
  const rainy = isRainy(day);
  const windy = isWindy(day);
  const extras = extrasFor(day, feelsC);

  const clean = input.items.filter((i) => !i.inLaundry);
  if (clean.length === 0) return { status: 'empty', band: band.name, feelsC, outfits: [], extras, tips: ['allInLaundry'] };

  const pool = styleFilter(clean, input.profile.stylePref);
  const tops = pool.filter((i) => i.category === 'top');
  const bottoms = pool.filter((i) => i.category === 'bottom');
  const dresses = pool.filter((i) => i.category === 'dress');
  const shoes = pool.filter((i) => i.category === 'shoes');
  const outers = pool.filter((i) => i.category === 'outerwear');

  if ((tops.length === 0 || bottoms.length === 0) && dresses.length === 0) {
    return { status: 'empty', band: band.name, feelsC, outfits: [], extras, tips: ['addTopsAndBottoms'] };
  }

  const wantOuter = band.needsOuterwear || rainy;
  if (wantOuter && outers.length === 0) tips.push('addOuterwear');
  if (rainy && !outers.some((o) => o.waterproof)) tips.push('addRainJacket');
  if (shoes.length === 0) tips.push('addShoes');

  const ctx: ScoreContext = {
    date: input.date,
    band,
    day,
    mood: input.mood,
    likedColors: input.profile.likedColors,
    dislikedColors: input.profile.dislikedColors,
    learning: input.learning,
    history: input.history ?? [],
    plannedItemIds: new Set(input.plannedItemIds ?? []),
  };

  // Pre-rank each list so the cap keeps the most promising items: warmth close to a fair share of the target, then taste.
  const slots = wantOuter ? 3 : 2;
  const targetMid = (band.targetMin + band.targetMax) / 2;
  const rank = (i: ClothingItem) => {
    const share = i.category === 'dress' ? (targetMid / slots) * 2 : targetMid / slots;
    const warmthFit = i.category === 'shoes' ? 0 : -Math.abs(i.warmth * (i.category === 'dress' ? 2 : 1) - share) / 2;
    // When it rains, waterproof outer layers must survive the trim so the rain rule can apply.
    const rainKeep = rainy && i.category === 'outerwear' && i.waterproof ? 100 : 0;
    return rainKeep + warmthFit + (input.learning.itemWeights[i.id] ?? 0) + (i.favorite ? 0.5 : 0) - (ctx.plannedItemIds.has(i.id) ? 1 : 0);
  };
  const outerOpts = wantOuter && outers.length > 0 ? outers : [];
  const count = () => (tops.length * bottoms.length + dresses.length) * Math.max(1, shoes.length) * Math.max(1, outerOpts.length);
  trimToCap([tops, bottoms, dresses, shoes, outerOpts], rank, count);

  const mains: ClothingItem[][] = [];
  for (const t of tops) for (const b of bottoms) mains.push([t, b]);
  for (const d of dresses) mains.push([d]);

  const combos: Combo[] = [];
  for (const main of mains) {
    for (const s of shoes.length ? shoes : [undefined]) {
      for (const o of outerOpts.length ? outerOpts : [undefined]) combos.push({ main, shoes: s, outer: o });
    }
  }

  // Hard rules (§3): waterproof outer when raining (if she owns one); warmth inside band ± tolerance.
  const hasWaterproof = outerOpts.some((o) => o.waterproof);
  const passes = (c: Combo) =>
    (!rainy || !hasWaterproof || c.outer?.waterproof === true) && bandDistance(warmthSum(c), band) <= C.warmthTolerance;
  let candidates = combos.filter(passes);
  if (candidates.length === 0) {
    // Soft fallback: still give her something, and say what would help.
    candidates = combos;
    const sums = combos.map(warmthSum);
    if (Math.max(...sums) < band.targetMin - C.warmthTolerance) tips.push('addWarmerClothes');
    else if (Math.min(...sums) > band.targetMax + C.warmthTolerance) tips.push('addLighterClothes');
  }

  const scored = candidates
    .map((c) => {
      const { total, factors } = scoreCombo(c, ctx);
      const ids = comboItems(c).map((i) => i.id);
      return { c, total, factors, ids, tie: hashString(input.date + '|' + ids.join(',')) };
    })
    .sort((a, b) => b.total - a.total || a.tie - b.tie);

  const picked: typeof scored = [];
  const usedMain = new Set<string>();
  for (const s of scored) {
    if (picked.length >= C.suggestionCount) break;
    const mainId = s.c.main[0].id;
    if (usedMain.has(mainId)) continue;
    usedMain.add(mainId);
    picked.push(s);
  }

  const outfits: Suggestion[] = picked.map((s) => ({
    itemIds: s.ids,
    mainId: s.c.main[0].id,
    score: s.total,
    factors: s.factors,
    warmth: warmthSum(s.c),
    reasons: buildReasons(s.c, s.factors, { band: band.name, feelsC, rainy, windy, mood: input.mood, learning: input.learning, likedColors: input.profile.likedColors }),
  }));

  return { status: 'ok', band: band.name, feelsC, outfits, extras, tips };
}

/** "Why this?" = the top 2 factors by weighted contribution that have something to say (§4). */
export function buildReasons(
  c: Combo,
  f: FactorScores,
  info: { band: BandName; feelsC: number; rainy: boolean; windy: boolean; mood?: Mood; learning: LearningState; likedColors: readonly ColorName[] },
): Reason[] {
  const items = comboItems(c);
  const order = (Object.keys(f) as FactorName[]).sort((a, b) => C.weights[b] * f[b] - C.weights[a] * f[a] || a.localeCompare(b));
  const reasons: Reason[] = [];
  for (const name of order) {
    if (reasons.length >= 2) break;
    const r = reasonFor(name);
    if (r) reasons.push(r);
  }
  return reasons;

  function reasonFor(name: FactorName): Reason | null {
    switch (name) {
      case 'weather':
        return f.weather >= 0.5 ? { kind: 'weather', band: info.band, feelsC: Math.round(info.feelsC), rainy: info.rainy, windy: info.windy } : null;
      case 'taste': {
        const best = [...items]
          .map((i) => ({ i, w: info.learning.itemWeights[i.id] ?? 0 }))
          .filter(({ i, w }) => w >= C.learning.likedItemAt || i.favorite)
          .sort((a, b) => b.w - a.w || Number(b.i.favorite) - Number(a.i.favorite) || a.i.id.localeCompare(b.i.id))[0];
        return best ? { kind: 'taste', itemId: best.i.id, favorite: best.i.favorite } : null;
      }
      case 'mood':
        return info.mood && f.mood > 0 ? { kind: 'mood', mood: info.mood } : null;
      case 'variety':
        return f.variety === 1 ? { kind: 'variety' } : null;
      case 'color':
        return items.some((i) => i.colors.some((col) => info.likedColors.includes(col))) ? { kind: 'colors' } : null;
    }
  }
}

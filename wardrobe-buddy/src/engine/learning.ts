import type { ClothingItem, LearningState, OutfitSource, Rating, StyleTag } from '@/domain/types';

import { ENGINE_CONFIG } from './engine.config';
import { clamp } from './hash';

const L = ENGINE_CONFIG.learning;

export function initialLearning(): LearningState {
  return { itemWeights: {}, tagWeights: {}, tempOffsetC: 0, updatedAt: null };
}

/**
 * Apply one rating (OUTFIT_ENGINE §6). Pure: returns a new state.
 * - item weight: w ← w + α·(stars − 3)/2, clamped to [-1, 1]
 * - "wore it" on an unchanged suggestion: +0.1 per item
 * - too cold → offset −0.5; too warm → +0.5, clamped to [-4, 4]
 * - "not my style" lowers the items' style tags; "love it" (♥) raises them
 */
export function applyRating(
  state: LearningState,
  rating: Rating,
  outfit: { itemIds: readonly string[]; source: OutfitSource },
  items: readonly ClothingItem[],
): LearningState {
  const itemWeights = { ...state.itemWeights };
  const tagWeights = { ...state.tagWeights };
  const delta = (L.alpha * (rating.stars - 3)) / 2 + (rating.wore && outfit.source === 'suggested' ? L.woreBonus : 0);
  for (const id of outfit.itemIds) itemWeights[id] = clampW((itemWeights[id] ?? 0) + delta);

  let tagDelta = 0;
  if (rating.reasons.includes('notMyStyle')) tagDelta -= L.tagStep;
  if (rating.reasons.includes('loveIt')) tagDelta += L.tagStep;
  if (tagDelta !== 0) {
    const tags = new Set<StyleTag>(items.filter((i) => outfit.itemIds.includes(i.id)).flatMap((i) => i.styleTags));
    for (const t of tags) tagWeights[t] = clampW((tagWeights[t] ?? 0) + tagDelta);
  }

  let tempOffsetC = state.tempOffsetC;
  if (rating.reasons.includes('tooCold')) tempOffsetC -= L.tempStepC;
  if (rating.reasons.includes('tooWarm')) tempOffsetC += L.tempStepC;
  tempOffsetC = clamp(tempOffsetC, L.tempMinC, L.tempMaxC);

  return { itemWeights, tagWeights, tempOffsetC, updatedAt: rating.createdAt };
}

/** Remove weights for deleted items so the state does not grow forever. */
export function pruneLearning(state: LearningState, existingIds: ReadonlySet<string>): LearningState {
  const itemWeights = Object.fromEntries(Object.entries(state.itemWeights).filter(([id]) => existingIds.has(id)));
  return { ...state, itemWeights };
}

export interface LearningSummary {
  likedItemIds: string[];
  likedTags: StyleTag[];
  runsCold: boolean;
  runsWarm: boolean;
  hasLearned: boolean;
}

/** Facts for the "I've learned you like hoodies and get cold easily" line in Me. */
export function summarizeLearning(state: LearningState): LearningSummary {
  const likedItemIds = Object.entries(state.itemWeights)
    .filter(([, w]) => w >= L.likedItemAt)
    .sort(([a, wa], [b, wb]) => wb - wa || a.localeCompare(b))
    .slice(0, 2)
    .map(([id]) => id);
  const likedTags = (Object.entries(state.tagWeights) as [StyleTag, number][])
    .filter(([, w]) => w >= L.likedTagAt)
    .sort(([a, wa], [b, wb]) => wb - wa || a.localeCompare(b))
    .slice(0, 2)
    .map(([t]) => t);
  const runsCold = state.tempOffsetC <= L.runsColdAtC;
  const runsWarm = state.tempOffsetC >= L.runsWarmAtC;
  return { likedItemIds, likedTags, runsCold, runsWarm, hasLearned: likedItemIds.length > 0 || likedTags.length > 0 || runsCold || runsWarm };
}

function clampW(w: number): number {
  return clamp(w, L.weightMin, L.weightMax);
}

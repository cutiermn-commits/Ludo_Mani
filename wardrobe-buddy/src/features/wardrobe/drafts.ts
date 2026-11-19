import type { ClothingItem } from '@/domain/types';

/**
 * Photo files made while editing an item that are NOT used by the saved item, so they can be
 * deleted after saving. Keeps both the photo and the cut-out (architecture + privacy review, D-059).
 */
export function draftsToDiscard(drafts: readonly string[], saved: Pick<ClothingItem, 'photoUri' | 'cutoutUri'>): string[] {
  const keep = new Set([saved.photoUri, saved.cutoutUri].filter(Boolean));
  return [...new Set(drafts)].filter((u) => !keep.has(u));
}

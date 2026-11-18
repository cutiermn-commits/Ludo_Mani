import type { Category, ClothingItem } from '@/domain/types';

/**
 * Where each garment cut-out sits on the avatar (D-059). Boxes are in avatar units
 * (the drawn avatar is 120 × 180 units) and are the SAME for everyone: one standard avatar
 * shape, never her body or size (PRIVACY_SAFETY §2.6). The cut-out is scaled to fit its box
 * ("contain"), so proportions are approximate by design. ASSUMPTION starting values.
 */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const AVATAR_UNITS = { w: 120, h: 180 } as const;

export const SLOT_BOX: Partial<Record<Category, Box>> = {
  bottom: { x: 30, y: 104, w: 60, h: 62 },
  shoes: { x: 26, y: 156, w: 68, h: 22 },
  top: { x: 12, y: 57, w: 96, h: 60 },
  dress: { x: 14, y: 57, w: 92, h: 104 },
  outerwear: { x: 6, y: 55, w: 108, h: 74 },
};

/** Back to front, so a jacket lies over the top and the top over the waistband. */
const ORDER: Category[] = ['bottom', 'shoes', 'dress', 'top', 'outerwear'];

export interface PlacedGarment {
  itemId: string;
  uri: string;
  category: Category;
  box: Box;
}

/** Garments with a cut-out, placed and in drawing order. Items without one keep the colour block. */
export function layoutGarments(items: readonly ClothingItem[]): PlacedGarment[] {
  const out: PlacedGarment[] = [];
  for (const category of ORDER) {
    const it = items.find((i) => i.category === category && i.cutoutUri);
    const box = SLOT_BOX[category];
    if (it?.cutoutUri && box) out.push({ itemId: it.id, uri: it.cutoutUri, category, box });
  }
  // A dress replaces top + bottom on the body: never draw both.
  if (out.some((g) => g.category === 'dress')) return out.filter((g) => g.category !== 'top' && g.category !== 'bottom');
  return out;
}

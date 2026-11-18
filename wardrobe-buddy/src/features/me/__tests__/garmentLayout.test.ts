import type { ClothingItem } from '@/domain/types';

import { AVATAR_UNITS, layoutGarments, SLOT_BOX } from '../garmentLayout';

const it_ = (id: string, category: ClothingItem['category'], cutoutUri?: string): ClothingItem => ({
  id, category, cutoutUri, colors: ['grey'], warmth: 2, waterproof: false, windproof: false, styleTags: [], occasions: [], favorite: false, inLaundry: false, createdAt: 'x',
});

describe('layoutGarments', () => {
  it('places each cut-out in its slot, back to front', () => {
    const out = layoutGarments([it_('j', 'outerwear', 'c/j.png'), it_('t', 'top', 'c/t.png'), it_('s', 'shoes', 'c/s.png'), it_('b', 'bottom', 'c/b.png')]);
    expect(out.map((g) => g.category)).toEqual(['bottom', 'shoes', 'top', 'outerwear']);
    expect(out[2]).toMatchObject({ itemId: 't', uri: 'c/t.png', box: SLOT_BOX.top });
  });
  it('skips items without a cut-out (they keep the colour block)', () => {
    expect(layoutGarments([it_('t', 'top'), it_('b', 'bottom', 'c/b.png')]).map((g) => g.itemId)).toEqual(['b']);
  });
  it('a dress is never drawn together with a top or bottom', () => {
    const out = layoutGarments([it_('d', 'dress', 'c/d.png'), it_('t', 'top', 'c/t.png'), it_('b', 'bottom', 'c/b.png'), it_('s', 'shoes', 'c/s.png')]);
    expect(out.map((g) => g.category)).toEqual(['shoes', 'dress']);
  });
  it('accessories are not placed', () => {
    expect(layoutGarments([it_('a', 'accessory', 'c/a.png')])).toEqual([]);
  });
  it('every slot lies inside the avatar', () => {
    for (const b of Object.values(SLOT_BOX)) {
      expect(b!.x).toBeGreaterThanOrEqual(0);
      expect(b!.y).toBeGreaterThanOrEqual(0);
      expect(b!.x + b!.w).toBeLessThanOrEqual(AVATAR_UNITS.w);
      expect(b!.y + b!.h).toBeLessThanOrEqual(AVATAR_UNITS.h);
    }
  });
});

describe('fitInSlot / drawn boxes', () => {
  it('a short top hangs from the shoulders, not the middle of the slot', () => {
    const [g] = layoutGarments([{ ...it_('t', 'top', 'c/t.png'), cutoutAspect: 2 }]);
    expect(g.drawn.y).toBe(SLOT_BOX.top!.y);
    expect(g.drawn.h).toBeLessThan(SLOT_BOX.top!.h);
  });
  it('shorts hang from the waist; shoes stand on the floor', () => {
    const out = layoutGarments([{ ...it_('b', 'bottom', 'c/b.png'), cutoutAspect: 1.4 }, { ...it_('s', 'shoes', 'c/s.png'), cutoutAspect: 4 }]);
    const shorts = out.find((g) => g.category === 'bottom')!;
    const shoes = out.find((g) => g.category === 'shoes')!;
    expect(shorts.drawn.y).toBe(SLOT_BOX.bottom!.y);
    expect(shoes.drawn.y + shoes.drawn.h).toBeCloseTo(SLOT_BOX.shoes!.y + SLOT_BOX.shoes!.h);
  });
  it('keeps the garment inside its slot and centred', () => {
    const [g] = layoutGarments([{ ...it_('j', 'outerwear', 'c/j.png'), cutoutAspect: 0.5 }]);
    const b = SLOT_BOX.outerwear!;
    expect(g.drawn.w).toBeLessThanOrEqual(b.w);
    expect(g.drawn.x - b.x).toBeCloseTo(b.x + b.w - (g.drawn.x + g.drawn.w));
  });
  it('a dress without a cut-out still hides a top cut-out', () => {
    expect(layoutGarments([it_('d', 'dress'), it_('t', 'top', 'c/t.png')])).toEqual([]);
  });
});

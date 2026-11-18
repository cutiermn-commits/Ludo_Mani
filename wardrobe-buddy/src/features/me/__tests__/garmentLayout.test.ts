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

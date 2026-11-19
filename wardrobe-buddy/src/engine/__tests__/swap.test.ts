import { swapIn } from '../swap';
import { suggest } from '../suggest';
import { day, input, item, wardrobe } from './fixtures';

describe('swapIn', () => {
  const items = wardrobe();
  const byId = (id: string) => items.find((i) => i.id === id)!;
  it('replaces the item of the same category', () => {
    expect(swapIn(['tee', 'jeans', 'sneakers'], byId('hoodie'), items)).toEqual(['jeans', 'sneakers', 'hoodie']);
  });
  it('a dress replaces top and bottom', () => {
    expect(swapIn(['tee', 'jeans', 'sneakers'], byId('dress'), items)).toEqual(['sneakers', 'dress']);
  });
  it('a top replaces a dress', () => {
    expect(swapIn(['dress', 'sneakers'], byId('tee'), items)).toEqual(['sneakers', 'tee']);
  });
  it('adding a jacket keeps everything else', () => {
    expect(swapIn(['tee', 'jeans'], byId('raincoat'), items)).toEqual(['tee', 'jeans', 'raincoat']);
  });
});

describe('spec numbers (hard-coded on purpose, so a wrong config value fails)', () => {
  it.each([
    [22, 'hot'],
    [21, 'mild'],
    [16, 'mild'],
    [15, 'cool'],
    [10, 'cool'],
    [9, 'cold'],
    [3, 'cold'],
    [2, 'freezing'],
  ])('feels %p °C → %s', (feels, band) => {
    expect(suggest(input({ weather: day(feels) })).band).toBe(band);
  });
});

describe('rain rule survives the combination cap', () => {
  it('keeps the only waterproof jacket even in a huge wardrobe', () => {
    const items = [
      ...Array.from({ length: 30 }, (_, k) => item({ id: `t${k}`, category: 'top', warmth: 3, favorite: true })),
      ...Array.from({ length: 30 }, (_, k) => item({ id: `b${k}`, category: 'bottom', warmth: 3, favorite: true })),
      ...Array.from({ length: 12 }, (_, k) => item({ id: `o${k}`, category: 'outerwear', warmth: 3, favorite: true })),
      item({ id: 'rain', category: 'outerwear', warmth: 1, waterproof: true }),
    ];
    const res = suggest(input({ items, weather: day(12, { rainChanceMaxPct: 90 }) }));
    expect(res.outfits[0].itemIds).toContain('rain');
    expect(res.tips).not.toContain('addRainJacket');
  });
});

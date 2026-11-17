import type { ClothingItem, WeatherDay } from '@/domain/types';

import { initialLearning } from '../learning';
import type { SuggestInput } from '../suggest';

let n = 0;
export function item(p: Partial<ClothingItem> & Pick<ClothingItem, 'category'>): ClothingItem {
  n += 1;
  return {
    id: p.id ?? `${p.category}-${n}`,
    colors: ['grey'],
    warmth: 2,
    waterproof: false,
    windproof: false,
    styleTags: [],
    occasions: ['school'],
    favorite: false,
    inLaundry: false,
    createdAt: '2026-11-01T07:00:00.000Z',
    ...p,
  };
}

export function day(feels: number, p: Partial<WeatherDay> = {}): WeatherDay {
  return {
    date: '2026-11-17',
    tempMinC: feels,
    tempMaxC: feels + 2,
    feelsMinC: feels,
    feelsMaxC: feels + 2,
    rainChanceMaxPct: 0,
    rainMm: 0,
    windMaxKmh: 10,
    uvMax: 1,
    snow: false,
    ...p,
  };
}

/** A realistic small Copenhagen wardrobe covering every band. */
export function wardrobe(): ClothingItem[] {
  return [
    item({ id: 'tee', category: 'top', subcategory: 'tshirt', warmth: 1, colors: ['white'], styleTags: ['casual'] }),
    item({ id: 'tee-pink', category: 'top', subcategory: 'tshirt', warmth: 1, colors: ['pink'], styleTags: ['bright'] }),
    item({ id: 'sweater', category: 'top', subcategory: 'sweater', warmth: 3, colors: ['navy'], styleTags: ['cozy'] }),
    item({ id: 'hoodie', category: 'top', subcategory: 'hoodie', warmth: 4, colors: ['grey'], styleTags: ['cozy', 'comfy'] }),
    item({ id: 'shorts', category: 'bottom', subcategory: 'shorts', warmth: 1, colors: ['denim'] }),
    item({ id: 'jeans', category: 'bottom', subcategory: 'jeans', warmth: 3, colors: ['denim'], styleTags: ['casual'] }),
    item({ id: 'leggings', category: 'bottom', subcategory: 'leggings', warmth: 2, colors: ['black'], styleTags: ['sporty'] }),
    item({ id: 'thermal', category: 'bottom', subcategory: 'trousers', warmth: 5, colors: ['black'] }),
    item({ id: 'dress', category: 'dress', subcategory: 'dress', warmth: 1, colors: ['yellow'], styleTags: ['fancy'] }),
    item({ id: 'sneakers', category: 'shoes', subcategory: 'sneakers', warmth: 2, colors: ['white'], styleTags: ['sporty'] }),
    item({ id: 'boots', category: 'shoes', subcategory: 'boots', warmth: 4, waterproof: true, colors: ['brown'] }),
    item({ id: 'raincoat', category: 'outerwear', subcategory: 'raincoat', warmth: 2, waterproof: true, windproof: true, colors: ['yellow'] }),
    item({ id: 'cardigan', category: 'outerwear', subcategory: 'cardigan', warmth: 2, colors: ['beige'], styleTags: ['cozy'] }),
    item({ id: 'puffer', category: 'outerwear', subcategory: 'puffer', warmth: 5, windproof: true, waterproof: true, colors: ['black'] }),
  ];
}

export function input(p: Partial<SuggestInput> = {}): SuggestInput {
  return {
    date: '2026-11-17',
    items: wardrobe(),
    profile: { stylePref: 'mix', likedColors: [], dislikedColors: [], tempOffsetC: 0 },
    weather: day(12),
    learning: initialLearning(),
    history: [],
    ...p,
  };
}

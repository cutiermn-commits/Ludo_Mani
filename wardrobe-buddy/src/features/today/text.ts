import type { ClothingItem, ExtraKind } from '@/domain/types';
import type { Reason, Tip } from '@/engine';
import { formatTemp, type TKey } from '@/i18n';
import { useApp } from '@/features/app/AppState';
import { useItemName } from '@/features/wardrobe/visuals';

const cap = (s: string) => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s);

/** Turns engine reasons into one kid-friendly "Why this?" sentence. */
export function useWhyText() {
  const { t, locale } = useApp();
  const nameOf = useItemName();
  return (reasons: Reason[], items: ClothingItem[]): string => {
    const parts = reasons.map((r) => {
      switch (r.kind) {
        case 'weather': {
          const extra = r.rainy && r.windy ? t('why.rainWind') : r.rainy ? t('why.rain') : r.windy ? t('why.wind') : '';
          return t(`why.band.${r.band}` as TKey, { temp: formatTemp(r.feelsC, locale) }) + extra;
        }
        case 'taste': {
          const it = items.find((i) => i.id === r.itemId);
          const name = it ? nameOf(it) : '';
          return r.favorite ? t('why.favorite', { item: name }) : t('why.liked', { item: name });
        }
        case 'mood':
          return t('why.mood', { mood: t(`mood.${r.mood}` as TKey) });
        case 'variety':
          return t('why.variety');
        case 'colors':
          return t('why.colors');
      }
    });
    if (parts.length === 0) return t('why.fallback');
    if (parts.length === 1) return `${cap(parts[0])}.`;
    return t('why.join', { a: cap(parts[0]), b: parts[1] });
  };
}

export const EXTRA_ICON: Record<ExtraKind, string> = {
  rainJacket: '🧥',
  umbrella: '☂️',
  hood: '🌬️',
  hat: '🧶',
  gloves: '🧤',
  scarf: '🧣',
  lipBalm: '💧',
  sunscreen: '🧴',
  cap: '🧢',
  warmBoots: '🥾',
  layers: '🧅',
};

export const TIP_KEY: Record<Tip, TKey> = {
  needWeather: 'tip.needWeather',
  emptyWardrobe: 'tip.emptyWardrobe',
  allInLaundry: 'tip.allInLaundry',
  addTopsAndBottoms: 'tip.addTopsAndBottoms',
  addOuterwear: 'tip.addOuterwear',
  addRainJacket: 'tip.addRainJacket',
  addShoes: 'tip.addShoes',
  addWarmerClothes: 'tip.addWarmerClothes',
  addLighterClothes: 'tip.addLighterClothes',
};

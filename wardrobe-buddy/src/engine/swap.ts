import type { ClothingItem } from '@/domain/types';

/**
 * Put `item` into the outfit, replacing whatever it conflicts with:
 * same category is replaced; a dress replaces top + bottom; a top or bottom replaces a dress.
 */
export function swapIn(currentIds: readonly string[], item: ClothingItem, items: readonly ClothingItem[]): string[] {
  const cat = (id: string) => items.find((i) => i.id === id)?.category;
  const clashes = (id: string) => {
    const c = cat(id);
    if (c === item.category) return true;
    if (item.category === 'dress') return c === 'top' || c === 'bottom';
    if (item.category === 'top' || item.category === 'bottom') return c === 'dress';
    return false;
  };
  return [...currentIds.filter((id) => !clashes(id)), item.id];
}

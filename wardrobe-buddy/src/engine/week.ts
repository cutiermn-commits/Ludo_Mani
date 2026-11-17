import type { WeatherDay } from '@/domain/types';

import { suggest, type SuggestInput, type SuggestResult } from './suggest';

export interface PlannedDay {
  date: string;
  weather: WeatherDay;
  result: SuggestResult;
}

/**
 * Greedy week plan (§5): day by day, each day's chosen main pieces count as
 * "planned" for the following days so the variety penalty spreads outfits out.
 */
export function planWeek(days: readonly WeatherDay[], base: Omit<SuggestInput, 'date' | 'weather' | 'plannedItemIds'>): PlannedDay[] {
  const planned = new Set<string>();
  const out: PlannedDay[] = [];
  for (const weather of days) {
    const result = suggest({ ...base, date: weather.date, weather, plannedItemIds: [...planned] });
    const top = result.outfits[0];
    if (top) {
      const mainIds = top.itemIds.filter((id) => base.items.find((i) => i.id === id && ['top', 'bottom', 'dress'].includes(i.category)));
      mainIds.forEach((id) => planned.add(id));
    }
    out.push({ date: weather.date, weather, result });
  }
  return out;
}

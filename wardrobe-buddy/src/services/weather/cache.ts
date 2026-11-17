import type { City } from '@/domain/types';

import type { CachedForecast, WeatherProvider } from './types';

/** Forecasts are reused for about an hour (ARCHITECTURE "Weather flow", D-008 rate limits). */
export const CACHE_TTL_MS = 60 * 60 * 1000;

export type ForecastOutcome =
  | { kind: 'fresh'; forecast: CachedForecast }
  | { kind: 'cached'; forecast: CachedForecast } // still within TTL, no network call
  | { kind: 'stale'; forecast: CachedForecast } // network failed, showing an older one with its time
  | { kind: 'none' }; // network failed and nothing cached → ask "What's it like outside?"

const sameCity = (c: CachedForecast, city: City) => c.lat === city.lat && c.lon === city.lon;

/** Pure-ish orchestration: `now` is passed in so tests control time. */
export async function loadForecast(
  provider: WeatherProvider,
  city: City,
  cached: CachedForecast | null,
  now: Date,
  opts: { ignoreTtl?: boolean } = {},
): Promise<ForecastOutcome> {
  const usable = cached && sameCity(cached, city) ? cached : null;
  if (usable && !opts.ignoreTtl && now.getTime() - Date.parse(usable.fetchedAt) < CACHE_TTL_MS) return { kind: 'cached', forecast: usable };
  try {
    const days = await provider.getForecast(city);
    if (days.length === 0) throw new Error('empty forecast');
    return { kind: 'fresh', forecast: { lat: city.lat, lon: city.lon, fetchedAt: now.toISOString(), days } };
  } catch {
    return usable ? { kind: 'stale', forecast: usable } : { kind: 'none' };
  }
}

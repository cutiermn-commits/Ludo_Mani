import type { City, Locale, WeatherDay } from '@/domain/types';

/** Swappable weather source (ARCHITECTURE: "Every outside service sits behind an interface"). */
export interface WeatherProvider {
  /** City search. Returns place names in the requested language where available. */
  searchCity(query: string, locale: Locale): Promise<City[]>;
  /** Today + 7 days, summarised over school hours. */
  getForecast(city: City): Promise<WeatherDay[]>;
}

export interface CachedForecast {
  /** Which city this forecast is for (lat/lon rounded, as stored on the profile). */
  lat: number;
  lon: number;
  /** ISO timestamp of the fetch. */
  fetchedAt: string;
  days: WeatherDay[];
}

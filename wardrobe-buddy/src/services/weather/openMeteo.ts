import type { City, Locale, WeatherDay, WeatherHour } from '@/domain/types';
import { summarizeSchoolHours } from '@/engine';

import { safeFetchJson, type FetchLike } from '../net/safeFetch';
import type { WeatherProvider } from './types';

/**
 * Open-Meteo (CC BY 4.0 — attribution shown in the parent/About area).
 *
 * Geocoding: VERIFIED 2026-11-17 by a live call to
 *   https://geocoding-api.open-meteo.com/v1/search?name=København&count=2&language=da&format=json
 *   → results[].{name, latitude, longitude, country, admin1, timezone}.
 * Forecast: hourly variable names below are NOT VERIFIED by a live call from the build sandbox
 *   (the shared sandbox IP got HTTP 429 "Daily API request limit exceeded"). They follow
 *   Open-Meteo's documented names; tests use a recorded-shape fixture. Re-check on a device.
 */
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'wind_speed_10m',
  'uv_index',
  'snowfall',
] as const;

interface GeoResponse {
  results?: { name: string; latitude: number; longitude: number; country?: string; admin1?: string; timezone?: string }[];
}

interface ForecastResponse {
  hourly?: Partial<Record<(typeof HOURLY_VARS)[number], (number | null)[]>> & { time?: string[] };
}

/** Round to ~1 km so the request carries a city centre, never a precise point. */
const coarse = (n: number) => Math.round(n * 100) / 100;

export function buildGeocodeUrl(query: string, locale: Locale): string {
  return `${GEO_URL}?name=${encodeURIComponent(query.trim())}&count=8&language=${locale}&format=json`;
}

export function buildForecastUrl(city: Pick<City, 'lat' | 'lon'>): string {
  return `${FORECAST_URL}?latitude=${coarse(city.lat)}&longitude=${coarse(city.lon)}&hourly=${HOURLY_VARS.join(',')}&timezone=auto&forecast_days=8&wind_speed_unit=kmh`;
}

export function parseGeocode(json: GeoResponse): City[] {
  return (json.results ?? []).map((r) => ({
    name: r.name,
    label: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: coarse(r.latitude),
    lon: coarse(r.longitude),
    timezone: r.timezone,
  }));
}

export function parseForecast(json: ForecastResponse): WeatherDay[] {
  const h = json.hourly;
  const time = h?.time ?? [];
  const num = (k: (typeof HOURLY_VARS)[number], i: number) => h?.[k]?.[i] ?? 0;
  const known = (k: (typeof HOURLY_VARS)[number], i: number) => typeof h?.[k]?.[i] === 'number';
  // An hour without temperatures is dropped (0 °C would wrongly mean "cold"); missing rain/wind/UV/snow count as 0.
  const usable = time.map((t, i) => [t, i] as const).filter(([, i]) => known('temperature_2m', i) && known('apparent_temperature', i));
  const hours: WeatherHour[] = usable.map(([t, i]) => ({
    time: t,
    tempC: num('temperature_2m', i),
    feelsC: num('apparent_temperature', i),
    rainChancePct: num('precipitation_probability', i),
    rainMm: num('precipitation', i),
    windKmh: num('wind_speed_10m', i),
    uvIndex: num('uv_index', i),
    snowCm: num('snowfall', i),
  }));
  return summarizeSchoolHours(hours);
}

export function createOpenMeteoProvider(fetchImpl?: FetchLike): WeatherProvider {
  return {
    async searchCity(query, locale) {
      if (query.trim().length < 2) return [];
      return parseGeocode(await safeFetchJson<GeoResponse>(buildGeocodeUrl(query, locale), { fetchImpl }));
    },
    async getForecast(city) {
      return parseForecast(await safeFetchJson<ForecastResponse>(buildForecastUrl(city), { fetchImpl }));
    },
  };
}

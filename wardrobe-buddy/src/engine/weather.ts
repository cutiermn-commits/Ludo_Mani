import type { WeatherDay, WeatherHour } from '@/domain/types';

import { BANDS, ENGINE_CONFIG, type Band } from './engine.config';

/** Find the warmth band for a feels-like temperature (°C). */
export function bandFor(feelsC: number): Band {
  // BANDS ends with -Infinity, so find() always succeeds.
  return BANDS.find((b) => feelsC >= b.minFeelsC) as Band;
}

export function bandIndex(feelsC: number): number {
  return BANDS.indexOf(bandFor(feelsC));
}

/**
 * The feels-like value the engine dresses for: the coldest school hour,
 * plus her profile offset and the learned offset (§1, D-016).
 */
export function effectiveFeels(day: WeatherDay, profileOffsetC: number, learnedOffsetC: number): number {
  return day.feelsMinC + profileOffsetC + learnedOffsetC;
}

export function isRainy(day: WeatherDay): boolean {
  return day.rainChanceMaxPct >= ENGINE_CONFIG.rain.chancePct || day.rainMm >= ENGINE_CONFIG.rain.mm;
}

export function isWindy(day: WeatherDay): boolean {
  return day.windMaxKmh >= ENGINE_CONFIG.windyKmh;
}

export function swingC(day: WeatherDay): number {
  return day.feelsMaxC - day.feelsMinC;
}

/**
 * Summarise hourly forecast rows into one WeatherDay per date, using school hours only.
 * Days with no school-hour rows are skipped. Pure: works on the local time strings.
 */
export function summarizeSchoolHours(hours: readonly WeatherHour[]): WeatherDay[] {
  const { start, end } = ENGINE_CONFIG.schoolHours;
  const byDate = new Map<string, WeatherHour[]>();
  for (const h of hours) {
    const date = h.time.slice(0, 10);
    const hour = Number(h.time.slice(11, 13));
    if (!Number.isFinite(hour) || hour < start || hour >= end) continue;
    const list = byDate.get(date) ?? [];
    list.push(h);
    byDate.set(date, list);
  }
  const days: WeatherDay[] = [];
  for (const [date, list] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    days.push({
      date,
      tempMinC: Math.min(...list.map((h) => h.tempC)),
      tempMaxC: Math.max(...list.map((h) => h.tempC)),
      feelsMinC: Math.min(...list.map((h) => h.feelsC)),
      feelsMaxC: Math.max(...list.map((h) => h.feelsC)),
      rainChanceMaxPct: Math.max(...list.map((h) => h.rainChancePct)),
      rainMm: round1(list.reduce((s, h) => s + h.rainMm, 0)),
      windMaxKmh: Math.max(...list.map((h) => h.windKmh)),
      uvMax: Math.max(...list.map((h) => h.uvIndex)),
      snow: list.some((h) => h.snowCm > 0),
    });
  }
  return days;
}

export type ManualWeather = 'sunny' | 'rainy' | 'cold';

/**
 * Offline fallback: her answer to "What's it like outside?" becomes a WeatherDay.
 * Values are ASSUMPTION representatives of each answer.
 */
export function manualWeatherDay(date: string, kind: ManualWeather): WeatherDay {
  const base = { date, rainChanceMaxPct: 0, rainMm: 0, windMaxKmh: 10, uvMax: 2, snow: false, manual: true };
  switch (kind) {
    case 'sunny':
      return { ...base, tempMinC: 18, tempMaxC: 22, feelsMinC: 18, feelsMaxC: 22, uvMax: 4 };
    case 'rainy':
      return { ...base, tempMinC: 11, tempMaxC: 13, feelsMinC: 10, feelsMaxC: 12, rainChanceMaxPct: 80, rainMm: 3 };
    case 'cold':
      return { ...base, tempMinC: 2, tempMaxC: 5, feelsMinC: 0, feelsMaxC: 3 };
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

import { getLocales } from 'expo-localization';

import type { Locale } from '@/domain/types';

import da from './da.json';
import en from './en.json';

export type TKey = keyof typeof en;
export type TParams = Record<string, string | number>;

const DICTS: Record<Locale, Record<TKey, string>> = { en, da };

/** Default language: Danish if the device is Danish, otherwise English (D-014). */
export function detectLocale(): Locale {
  try {
    return getLocales()[0]?.languageCode === 'da' ? 'da' : 'en';
  } catch {
    return 'en';
  }
}

export function translate(locale: Locale, key: TKey, params?: TParams): string {
  const raw = DICTS[locale][key] ?? DICTS.en[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

const intlLocale = (l: Locale) => (l === 'da' ? 'da-DK' : 'en-GB');

/** "7°" / "−3°" with the locale's minus sign and digits. */
export function formatTemp(n: number, locale: Locale): string {
  return `${new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 }).format(Math.round(n))}°`;
}

export function formatNumber(n: number, locale: Locale, digits = 0): string {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: digits }).format(n);
}

/** Weekday for a YYYY-MM-DD date. Uses UTC noon so the device time zone cannot shift the day. */
export function formatWeekday(date: string, locale: Locale, style: 'long' | 'short' = 'long'): string {
  const d = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: style, timeZone: 'UTC' }).format(d);
}

export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

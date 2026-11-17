import * as fs from 'fs';
import * as path from 'path';

import type { City } from '@/domain/types';

import { ALLOWED_HOSTS, BlockedHostError, hostOf, isAllowedUrl, safeFetchJson, type FetchLike } from '../net/safeFetch';
import { loadForecast } from '../weather/cache';
import { buildForecastUrl, buildGeocodeUrl, createOpenMeteoProvider, parseForecast } from '../weather/openMeteo';

const SRC = path.join(__dirname, '..', '..');
const ROOT = path.join(SRC, '..');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

const okJson = (body: unknown): Response => ({ ok: true, status: 200, json: async () => body }) as Response;

describe('host allowlist', () => {
  it('allows only the weather + geocoding hosts over https', () => {
    expect(ALLOWED_HOSTS).toEqual(['api.open-meteo.com', 'geocoding-api.open-meteo.com']);
    expect(isAllowedUrl('https://api.open-meteo.com/v1/forecast?x=1')).toBe(true);
    expect(isAllowedUrl('https://geocoding-api.open-meteo.com/v1/search')).toBe(true);
    expect(isAllowedUrl('http://api.open-meteo.com/v1/forecast')).toBe(false);
    expect(isAllowedUrl('https://api.open-meteo.com.evil.example/x')).toBe(false);
    expect(isAllowedUrl('https://evil.example/?https://api.open-meteo.com')).toBe(false);
    expect(isAllowedUrl('https://user@api.open-meteo.com/')).toBe(false);
    expect(hostOf('https://API.open-meteo.com:443/x')).toBe('api.open-meteo.com');
  });

  it('refuses other hosts before any request is made', async () => {
    const spy = jest.fn<ReturnType<FetchLike>, Parameters<FetchLike>>();
    await expect(safeFetchJson('https://example.com/track', { fetchImpl: spy })).rejects.toBeInstanceOf(BlockedHostError);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sends no credentials, headers or referrer', async () => {
    const spy = jest.fn<ReturnType<FetchLike>, Parameters<FetchLike>>(async () => okJson({}));
    await safeFetchJson('https://api.open-meteo.com/v1/forecast', { fetchImpl: spy });
    const init = spy.mock.calls[0][1];
    expect(init).toMatchObject({ method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer' });
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('throws on HTTP errors', async () => {
    const fail: FetchLike = async () => ({ ok: false, status: 429 }) as Response;
    await expect(safeFetchJson('https://api.open-meteo.com/x', { fetchImpl: fail })).rejects.toThrow('HTTP 429');
  });

  it('no other file in src/ calls fetch, XMLHttpRequest or WebSocket', () => {
    const offenders = walk(SRC)
      .filter((f) => !f.endsWith(path.join('net', 'safeFetch.ts')))
      .filter((f) => /\bfetch\s*\(|\.fetch\b|XMLHttpRequest|WebSocket|sendBeacon|EventSource|navigator\.sendBeacon/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const approved = JSON.parse(fs.readFileSync(path.join(ROOT, 'approved-dependencies.json'), 'utf8'));

  it('every runtime dependency was reviewed (approved-dependencies.json, DECISIONS D-024)', () => {
    const unreviewed = Object.keys(pkg.dependencies).filter((d) => !(d in approved.dependencies));
    expect(unreviewed).toEqual([]);
  });

  it('no known ads/analytics/crash/telemetry SDKs anywhere in the lockfile', () => {
    const lock = fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8');
    // Matches top-level and nested installs (…/node_modules/x/node_modules/@sentry/…).
    const banned = /node_modules\/(@?(firebase|@react-native-firebase|@sentry|sentry-expo|@amplitude|@segment|mixpanel|@bugsnag|appcenter|appsflyer|react-native-appsflyer|@adjust|react-native-adjust|react-native-google-mobile-ads|expo-ads-admob|react-native-fbsdk|react-native-fbsdk-next|@datadog|posthog-react-native|expo-tracking-transparency|expo-insights|expo-updates))["/]/;
    expect(lock.match(banned)?.[0] ?? null).toBeNull();
  });
});

describe('Open-Meteo provider', () => {
  const city: City = { name: 'København', label: 'Danmark', lat: 55.67594, lon: 12.56553 };

  it('requests a coarse city centre and no identifiers', () => {
    const url = buildForecastUrl(city);
    expect(url).toContain('latitude=55.68&longitude=12.57');
    expect(url).not.toMatch(/apikey|device|uid|id=/i);
    expect(buildGeocodeUrl(' Køge ', 'da')).toBe('https://geocoding-api.open-meteo.com/v1/search?name=K%C3%B8ge&count=8&language=da&format=json');
  });

  it('parses geocoding results (shape verified against a live response)', async () => {
    const fetchImpl: FetchLike = async () =>
      okJson({ results: [{ name: 'København', latitude: 55.67594, longitude: 12.56553, country: 'Danmark', admin1: 'Region Hovedstaden', timezone: 'Europe/Copenhagen' }] });
    const res = await createOpenMeteoProvider(fetchImpl).searchCity('Køb', 'da');
    expect(res).toEqual([{ name: 'København', label: 'Region Hovedstaden, Danmark', lat: 55.68, lon: 12.57, timezone: 'Europe/Copenhagen' }]);
    expect(await createOpenMeteoProvider(fetchImpl).searchCity('K', 'da')).toEqual([]);
    expect(await createOpenMeteoProvider(async () => okJson({})).searchCity('Nowhere', 'en')).toEqual([]);
  });

  it('parses hourly forecast into school-hour days, treating nulls as 0', async () => {
    const json = {
      hourly: {
        time: ['2026-11-17T08:00', '2026-11-17T09:00'],
        temperature_2m: [5, 6],
        apparent_temperature: [2, 3],
        precipitation_probability: [40, null],
        precipitation: [0.2, 0.3],
        wind_speed_10m: [20, 31],
        uv_index: [0, 1],
        snowfall: [0, 0],
      },
    };
    const days = await createOpenMeteoProvider(async () => okJson(json)).getForecast(city);
    expect(days).toEqual([
      { date: '2026-11-17', tempMinC: 5, tempMaxC: 6, feelsMinC: 2, feelsMaxC: 3, rainChanceMaxPct: 40, rainMm: 0.5, windMaxKmh: 31, uvMax: 1, snow: false },
    ]);
    expect(parseForecast({})).toEqual([]);
  });
});

describe('forecast cache', () => {
  const city: City = { name: 'X', label: '', lat: 1, lon: 2 };
  const days = [{ date: '2026-11-17', tempMinC: 1, tempMaxC: 2, feelsMinC: 1, feelsMaxC: 2, rainChanceMaxPct: 0, rainMm: 0, windMaxKmh: 0, uvMax: 0, snow: false }];
  const now = new Date('2026-11-17T07:00:00Z');
  const cached = { lat: 1, lon: 2, fetchedAt: '2026-11-17T06:30:00Z', days };
  const provider = (ok: boolean) => ({ searchCity: jest.fn(), getForecast: jest.fn(async () => (ok ? days : Promise.reject(new Error('offline')))) });

  it('uses a cache younger than an hour without a network call', async () => {
    const p = provider(true);
    expect((await loadForecast(p, city, cached, now)).kind).toBe('cached');
    expect(p.getForecast).not.toHaveBeenCalled();
  });
  it('refreshes an old cache', async () => {
    const res = await loadForecast(provider(true), city, cached, new Date('2026-11-17T08:00:00Z'));
    expect(res).toMatchObject({ kind: 'fresh', forecast: { fetchedAt: '2026-11-17T08:00:00.000Z' } });
  });
  it('offline with an old cache → stale forecast with its time', async () => {
    expect((await loadForecast(provider(false), city, cached, new Date('2026-11-17T09:00:00Z'))).kind).toBe('stale');
  });
  it('offline and nothing cached (or another city) → none', async () => {
    expect((await loadForecast(provider(false), city, null, now)).kind).toBe('none');
    expect((await loadForecast(provider(false), { ...city, lat: 9 }, cached, now)).kind).toBe('none');
  });
  it('an empty forecast counts as a failure', async () => {
    const p = { searchCity: jest.fn(), getForecast: jest.fn(async () => []) };
    expect((await loadForecast(p, city, null, now)).kind).toBe('none');
  });
});

describe('forecast nulls', () => {
  it('drops hours without a temperature instead of treating them as 0 °C', () => {
    const days = parseForecast({
      hourly: {
        time: ['2026-11-17T08:00', '2026-11-17T09:00'],
        temperature_2m: [null, 15],
        apparent_temperature: [null, 14],
        precipitation_probability: [null, null],
      },
    });
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ feelsMinC: 14, rainChanceMaxPct: 0 });
  });
});

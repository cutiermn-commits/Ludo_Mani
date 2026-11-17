import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createMemoryStorage } from '@/data/storage';
import type { City, Outfit, Profile, WeatherDay } from '@/domain/types';
import type { WeatherProvider } from '@/services/weather/types';

import { AppProvider, useApp } from '../AppState';

// The native SQLite store isn't used here (each test passes its own memory storage).
jest.mock('@/data/kv', () => ({ deviceStorage: {} }));
jest.mock('@/services/photos/store', () => ({ photoStore: { save: jest.fn(), remove: jest.fn(), removeAll: jest.fn() } }));

const CPH: City = { name: 'København', label: 'DK', lat: 55.68, lon: 12.57 };
const AAR: City = { name: 'Aarhus', label: 'DK', lat: 56.16, lon: 10.2 };
const dayFor = (feels: number): WeatherDay => ({
  date: '2026-11-17', tempMinC: feels, tempMaxC: feels, feelsMinC: feels, feelsMaxC: feels,
  rainChanceMaxPct: 0, rainMm: 0, windMaxKmh: 0, uvMax: 0, snow: false,
});
const profile = (p: Partial<Profile> = {}): Profile => ({
  id: 'p', nickname: 'Star', ageBand: '11-12', uiStyle: 'playful', stylePref: 'mix', likedColors: [], dislikedColors: [],
  tempOffsetC: 0, theme: 'purple', themeMode: 'system', locale: 'en', avatar: { skin: 0, hair: 0, hairStyle: 'long' },
  weatherConsent: true, city: CPH, ...p,
});

async function setup(provider: WeatherProvider) {
  const storage = createMemoryStorage();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppProvider storage={storage} weather={provider}>
      {children}
    </AppProvider>
  );
  return renderHook(() => useApp(), { wrapper });
}

const outfit = (id: string, itemIds: string[]): Outfit => ({ id, date: '2026-11-17', itemIds, extras: [], source: 'suggested' });

describe('AppState', () => {
  it('counts a day only once in learning, even if the outfit is changed and rated again', async () => {
    const provider = { searchCity: jest.fn(), getForecast: jest.fn(async () => [dayFor(5)]) };
    const { result } = await setup(provider);
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.saveProfile(profile()));
    await act(() => result.current.saveOutfit(outfit('o1', ['a'])));
    await act(() => result.current.rateOutfit({ outfitId: 'o1', stars: 5, reasons: ['tooCold'], wore: false, createdAt: 'x' }));
    // She changes today's outfit after rating; it keeps the day's id …
    await act(() => result.current.saveOutfit(outfit('o2', ['b'])));
    expect(result.current.outfits.map((o) => o.id)).toEqual(['o1']);
    // … so a second rating for the day is ignored.
    await act(() => result.current.rateOutfit({ outfitId: 'o1', stars: 5, reasons: ['tooCold'], wore: false, createdAt: 'y' }));
    expect(result.current.ratings).toHaveLength(1);
    expect(result.current.learning.tempOffsetC).toBe(-0.5);
  });

  it('makes no network call without parent consent', async () => {
    const provider = { searchCity: jest.fn(async () => [CPH]), getForecast: jest.fn(async () => [dayFor(5)]) };
    const { result } = await setup(provider);
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.saveProfile(profile({ weatherConsent: false })));
    await act(() => result.current.refreshWeather(true));
    await expect(result.current.searchCity('Køb', 'da', false)).rejects.toThrow('no consent');
    expect(provider.getForecast).not.toHaveBeenCalled();
    expect(provider.searchCity).not.toHaveBeenCalled();
  });

  it('a slow reply for the old city cannot overwrite the new city', async () => {
    let releaseOld: (d: WeatherDay[]) => void = () => undefined;
    const provider = {
      searchCity: jest.fn(),
      getForecast: jest.fn((c: City) => (c.name === 'København' ? new Promise<WeatherDay[]>((r) => (releaseOld = r)) : Promise.resolve([dayFor(20)]))),
    };
    const { result } = await setup(provider);
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.saveProfile(profile()));
    await waitFor(() => expect(provider.getForecast).toHaveBeenCalledTimes(1));
    await act(() => result.current.updateProfile({ city: AAR }));
    await waitFor(() => expect(result.current.forecast?.lat).toBe(AAR.lat));
    await act(async () => releaseOld([dayFor(-5)]));
    expect(result.current.forecast).toMatchObject({ lat: AAR.lat, days: [{ feelsMinC: 20 }] });
  });

  it('switches language at once', async () => {
    const { result } = await setup({ searchCity: jest.fn(), getForecast: jest.fn(async () => []) });
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.setLocale('da'));
    expect(result.current.t('tab.today')).toBe('I dag');
    await act(() => result.current.setLocale('en'));
    expect(result.current.t('tab.today')).toBe('Today');
  });
});

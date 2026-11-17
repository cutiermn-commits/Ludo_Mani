import { AppState as RNAppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { deviceStorage } from '@/data/kv';
import { createRepository, emptyAppData, type AppData } from '@/data/repository';
import type { City, ClothingItem, Locale, Mood, Outfit, Profile, Rating, WeatherDay } from '@/domain/types';
import { applyRating, initialLearning, pruneLearning } from '@/engine';
import { detectLocale, translate, type TKey, type TParams } from '@/i18n';
import { photoStore as devicePhotoStore } from '@/services/photos/store';
import type { PhotoStore } from '@/services/photos/types';
import { loadForecast, type ForecastOutcome } from '@/services/weather/cache';
import { createOpenMeteoProvider } from '@/services/weather/openMeteo';
import type { WeatherProvider } from '@/services/weather/types';

import { todayISO } from './dates';

export type WeatherStatus = 'idle' | 'loading' | ForecastOutcome['kind'];

interface AppState extends AppData {
  ready: boolean;
  locale: Locale;
  weatherStatus: WeatherStatus;
  /** Today's mood: kept in memory only (a morning choice, not profile data). */
  mood?: Mood;
  /** "What's it like outside?" answer, used when there is no forecast. */
  manualToday: WeatherDay | null;
  /** Local date, refreshed when the app comes back to the foreground. */
  today: string;
}

interface AppActions {
  t: (key: TKey, params?: TParams) => string;
  setLocale: (l: Locale) => void;
  saveProfile: (p: Profile) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  upsertItem: (item: ClothingItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  saveOutfit: (o: Outfit) => Promise<void>;
  rateOutfit: (r: Rating) => Promise<void>;
  resetLearning: () => Promise<void>;
  deleteEverything: () => Promise<void>;
  exportJson: () => Promise<string>;
  refreshWeather: (force?: boolean) => Promise<void>;
  setMood: (m: Mood | undefined) => void;
  setManualToday: (d: WeatherDay | null) => void;
  /** Town search. `consented` is the parent's choice (from the profile, or from onboarding before the profile exists). */
  searchCity: (query: string, locale: Locale, consented: boolean) => Promise<City[]>;
  photos: PhotoStore;
}

const Ctx = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({
  children,
  storage = deviceStorage,
  weather,
  photos = devicePhotoStore,
}: {
  children: ReactNode;
  storage?: typeof deviceStorage;
  weather?: WeatherProvider;
  photos?: PhotoStore;
}) {
  const repo = useMemo(() => createRepository(storage), [storage]);
  const rawProvider = useMemo(() => weather ?? createOpenMeteoProvider(), [weather]);
  const [state, setState] = useState<AppState>({
    ...emptyAppData(),
    ready: false,
    locale: detectLocale(),
    weatherStatus: 'idle',
    manualToday: null,
    today: todayISO(),
  });
  // Latest state for async actions without stale closures.
  const ref = useRef(state);
  useLayoutEffect(() => {
    ref.current = state;
  });

  // No parent consent → no network call, whoever asks (D-035).
  const provider: WeatherProvider = useMemo(
    () => ({
      searchCity: () => Promise.reject(new Error('use searchCity action')),
      getForecast: (c) => (ref.current.profile?.weatherConsent ? rawProvider.getForecast(c) : Promise.reject(new Error('no consent'))),
    }),
    [rawProvider],
  );

  useEffect(() => {
    let alive = true;
    repo.load().then((data) => {
      if (!alive) return;
      setState((s) => ({ ...s, ...data, ready: true, locale: data.profile?.locale ?? s.locale }));
    });
    return () => {
      alive = false;
    };
  }, [repo]);

  const patch = useCallback(
    async <K extends keyof AppData>(key: K, value: AppData[K]) => {
      ref.current = { ...ref.current, [key]: value };
      setState((s) => ({ ...s, [key]: value }));
      await repo.save(key, value);
    },
    [repo],
  );

  // Each weather request gets a number; only the latest one may write (no old-city replies winning a race).
  const requestSeq = useRef(0);
  const refreshWeather = useCallback(
    async (force = false) => {
      const city = ref.current.profile?.city;
      if (!city || !ref.current.profile?.weatherConsent) return;
      const seq = ++requestSeq.current;
      const cached = ref.current.forecast;
      setState((s) => ({ ...s, weatherStatus: 'loading' }));
      // A forced refresh skips the 1-hour cache but may still fall back to it when offline.
      const outcome = await loadForecast(provider, city, cached, new Date(), { ignoreTtl: force });
      const current = ref.current.profile?.city;
      if (seq !== requestSeq.current || !current || current.lat !== city.lat || current.lon !== city.lon) return;
      setState((s) => ({ ...s, weatherStatus: outcome.kind }));
      if (outcome.kind === 'fresh') await patch('forecast', outcome.forecast);
    },
    [patch, provider],
  );

  // Derived from state (not the ref) so a language switch re-renders every label at once.
  const t = useCallback((key: TKey, params?: TParams) => translate(state.locale, key, params), [state.locale]);

  const actions: Omit<AppActions, 't'> = useMemo(
    () => ({
      searchCity: (q, l, consented) => (consented ? rawProvider.searchCity(q, l) : Promise.reject(new Error('no consent'))),
      setLocale: (locale) => {
        setState((s) => ({ ...s, locale }));
        const p = ref.current.profile;
        if (p) void patch('profile', { ...p, locale });
      },
      saveProfile: async (p) => {
        setState((s) => ({ ...s, locale: p.locale }));
        await patch('profile', p);
      },
      updateProfile: async (changes) => {
        const p = ref.current.profile;
        if (!p) return;
        const next = { ...p, ...changes };
        if (changes.locale) setState((s) => ({ ...s, locale: changes.locale as Locale }));
        // A new city drops the old forecast; the city effect below fetches the new one.
        if (changes.city || changes.weatherConsent === false) await patch('forecast', null);
        await patch('profile', next);
      },
      upsertItem: async (item) => {
        const items = ref.current.items;
        const old = items.find((i) => i.id === item.id);
        if (old?.photoUri && old.photoUri !== item.photoUri) await photos.remove(old.photoUri);
        const next = items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item];
        await patch('items', next);
      },
      deleteItem: async (id) => {
        const gone = ref.current.items.find((i) => i.id === id);
        if (gone?.photoUri) await photos.remove(gone.photoUri);
        const next = ref.current.items.filter((i) => i.id !== id);
        await patch('items', next);
        await patch('learning', pruneLearning(ref.current.learning, new Set(next.map((i) => i.id))));
      },
      saveOutfit: async (o) => {
        // One outfit per day. Changing it keeps the day's id, so an earlier rating can't be applied twice.
        const prev = ref.current.outfits.find((x) => x.date === o.date);
        const next = [...ref.current.outfits.filter((x) => x.date !== o.date), prev ? { ...o, id: prev.id } : o];
        await patch('outfits', next);
      },
      rateOutfit: async (r) => {
        const outfit = ref.current.outfits.find((o) => o.id === r.outfitId);
        // One rating per outfit: learning must not count the same day twice.
        if (!outfit || ref.current.ratings.some((x) => x.outfitId === r.outfitId)) return;
        await patch('ratings', [...ref.current.ratings, r]);
        await patch('learning', applyRating(ref.current.learning, r, outfit, ref.current.items));
      },
      resetLearning: async () => patch('learning', initialLearning()),
      deleteEverything: async () => {
        requestSeq.current += 1; // ignore any weather reply still in flight
        ref.current = { ...ref.current, ...emptyAppData() };
        await repo.deleteAll();
        await photos.removeAll();
        setState((s) => ({ ...s, ...emptyAppData(), mood: undefined, manualToday: null, weatherStatus: 'idle' }));
      },
      exportJson: () => repo.exportJson(),
      photos,
      refreshWeather,
      setMood: (mood) => setState((s) => ({ ...s, mood })),
      setManualToday: (manualToday) => setState((s) => ({ ...s, manualToday })),
    }),
    [patch, photos, rawProvider, refreshWeather, repo],
  );

  // Fetch weather once the city is known.
  const cityKey = state.profile?.city && state.profile.weatherConsent ? `${state.profile.city.lat},${state.profile.city.lon}` : '';
  useEffect(() => {
    if (state.ready && cityKey) void refreshWeather();
  }, [state.ready, cityKey, refreshWeather]);

  // Coming back to the app (e.g. next morning): re-check the weather; the 1-hour cache avoids extra calls.
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void refreshWeather();
        setState((x) => ({ ...x, today: todayISO() }));
      }
    });
    return () => sub.remove();
  }, [refreshWeather]);

  const value = useMemo(() => ({ ...state, ...actions, t }), [state, actions, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

/** Today's weather: the forecast day for today (only if it is for her current city), else her manual answer, else null. */
export function useTodayWeather(): WeatherDay | null {
  const { forecast, manualToday, profile, today } = useApp();
  const sameCity = !!forecast && forecast.lat === profile?.city?.lat && forecast.lon === profile?.city?.lon;
  const fromForecast = sameCity ? forecast.days.find((d) => d.date === today) : undefined;
  return fromForecast ?? (manualToday?.date === today ? manualToday : null);
}

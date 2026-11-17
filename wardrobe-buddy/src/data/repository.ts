import type { ClothingItem, DiaryPhoto, LearningState, Outfit, Profile, Rating } from '@/domain/types';
import { initialLearning } from '@/engine';
import type { CachedForecast } from '@/services/weather/types';

import type { StorageAdapter } from './storage';

/** Everything the app keeps. All of it stays on the device (CLAUDE.md non-negotiable 2). */
export interface AppData {
  profile: Profile | null;
  items: ClothingItem[];
  outfits: Outfit[];
  ratings: Rating[];
  learning: LearningState;
  forecast: CachedForecast | null;
  /** "I wore this" outfit photos, always stored blurred (Phase 6). */
  diary: DiaryPhoto[];
}

const PREFIX = 'wb:v1:';
const KEYS = {
  profile: `${PREFIX}profile`,
  items: `${PREFIX}items`,
  outfits: `${PREFIX}outfits`,
  ratings: `${PREFIX}ratings`,
  learning: `${PREFIX}learning`,
  forecast: `${PREFIX}forecast`,
  diary: `${PREFIX}diary`,
} as const satisfies Record<keyof AppData, string>;

export function emptyAppData(): AppData {
  return { profile: null, items: [], outfits: [], ratings: [], learning: initialLearning(), forecast: null, diary: [] };
}

/** Bad or missing JSON falls back to the default instead of crashing the app. */
async function read<T>(s: StorageAdapter, key: string, fallback: T): Promise<T> {
  try {
    const raw = await s.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function createRepository(storage: StorageAdapter) {
  return {
    async load(): Promise<AppData> {
      const d = emptyAppData();
      return {
        profile: await read(storage, KEYS.profile, d.profile),
        items: await read(storage, KEYS.items, d.items),
        outfits: await read(storage, KEYS.outfits, d.outfits),
        ratings: await read(storage, KEYS.ratings, d.ratings),
        learning: await read(storage, KEYS.learning, d.learning),
        forecast: await read(storage, KEYS.forecast, d.forecast),
        diary: await read(storage, KEYS.diary, d.diary),
      };
    },
    async save<K extends keyof AppData>(key: K, value: AppData[K]): Promise<void> {
      await storage.setItem(KEYS[key], JSON.stringify(value));
    },
    /** Parent "delete everything": removes every key this app wrote. */
    async deleteAll(): Promise<void> {
      const keys = await storage.getAllKeys();
      for (const k of keys) if (k.startsWith(PREFIX)) await storage.removeItem(k);
    },
    /** Parent export (JSON). Photos are added to the export when photo capture lands (Phase 3/8). */
    async exportJson(): Promise<string> {
      return JSON.stringify({ app: 'wardrobe-buddy', schema: 1, data: await this.load() }, null, 2);
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;

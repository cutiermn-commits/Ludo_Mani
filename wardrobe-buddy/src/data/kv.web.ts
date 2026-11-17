// Web: browser localStorage (D-023). expo-sqlite also runs on web, but needs COOP/COEP
// headers on the host (docs.expo.dev/versions/v58.0.0/sdk/sqlite → "Web setup"), which
// many static hosts can't set. Our data is small JSON, so localStorage is enough.
import type { StorageAdapter } from './storage';

const ls = (): Storage | null => (typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage);

export const deviceStorage: StorageAdapter = {
  getItem: async (k) => ls()?.getItem(k) ?? null,
  setItem: async (k, v) => ls()?.setItem(k, v),
  removeItem: async (k) => ls()?.removeItem(k),
  getAllKeys: async () => {
    const s = ls();
    if (!s) return [];
    return Array.from({ length: s.length }, (_, i) => s.key(i)).filter((k): k is string => k !== null);
  },
};

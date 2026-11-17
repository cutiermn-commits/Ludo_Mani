// Native (iOS/Android): SQLite-backed key-value store from expo-sqlite.
// VERIFIED: docs.expo.dev/versions/v58.0.0/sdk/sqlite → "Key-value storage" (same API as AsyncStorage).
import Storage from 'expo-sqlite/kv-store';

import type { StorageAdapter } from './storage';

export const deviceStorage: StorageAdapter = {
  getItem: (k) => Storage.getItem(k),
  setItem: (k, v) => Storage.setItem(k, v),
  removeItem: (k) => Storage.removeItem(k),
  getAllKeys: () => Storage.getAllKeys(),
};

/**
 * StorageAdapter: the only way app code touches persistence (ARCHITECTURE "Principles").
 * Native: SQLite-backed key-value store (expo-sqlite/kv-store), see kv.ts.
 * Web: the browser's localStorage, see kv.web.ts (D-023).
 * Tests: createMemoryStorage().
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  /** All keys this app wrote (used by delete-all and export). */
  getAllKeys(): Promise<readonly string[]>;
}

export function createMemoryStorage(initial: Record<string, string> = {}): StorageAdapter {
  const m = new Map(Object.entries(initial));
  return {
    getItem: async (k) => m.get(k) ?? null,
    setItem: async (k, v) => void m.set(k, v),
    removeItem: async (k) => void m.delete(k),
    getAllKeys: async () => [...m.keys()],
  };
}

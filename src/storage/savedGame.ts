import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '../engine/game';
import { SaveEnvelope, deserialize, serialize } from '../engine/persist';

// Stored only on this device. Never sent anywhere.
const KEY = 'ludo.localGame';

// Writes are chained so they complete in order: the newest state always wins.
let queue: Promise<void> = Promise.resolve();

export async function loadSavedGame(): Promise<SaveEnvelope | null> {
  try {
    await queue; // let pending writes land before reading
    const env = deserialize(await AsyncStorage.getItem(KEY));
    if (!env) await AsyncStorage.removeItem(KEY); // drop corrupt/finished/old saves
    return env;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): Promise<void> {
  const data = state.phase === 'over' ? null : serialize(state, Date.now());
  queue = queue
    .then(() => (data === null ? AsyncStorage.removeItem(KEY) : AsyncStorage.setItem(KEY, data)))
    .catch(() => {
      // Saving is best-effort; the game continues regardless.
    });
  return queue;
}

export function clearSavedGame(): Promise<void> {
  queue = queue.then(() => AsyncStorage.removeItem(KEY)).catch(() => {});
  return queue;
}

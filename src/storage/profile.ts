import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { isAllowedName, randomName } from '../engine/names';

// The player's chosen name, stored only on this device.
const KEY = 'ludo.profileName';

export function useProfileName(): [string | null, (name: string) => void, () => string] {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (!alive) return;
        if (isAllowedName(v)) setName(v);
        else {
          const n = randomName();
          setName(n);
          AsyncStorage.setItem(KEY, n).catch(() => {});
        }
      })
      .catch(() => alive && setName(randomName()));
    return () => {
      alive = false;
    };
  }, []);

  const save = useCallback((n: string) => {
    if (!isAllowedName(n)) return;
    setName(n);
    AsyncStorage.setItem(KEY, n).catch(() => {});
  }, []);

  const shuffle = useCallback(() => {
    const n = randomName(Math.random, name ? [name] : []);
    save(n);
    return n;
  }, [name, save]);

  return [name, save, shuffle];
}

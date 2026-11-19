import { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';

import type { City } from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import { Button, Chip, T } from '@/ui/components';
import { radius, space, TAP } from '@/ui/theme';
import { useTheme } from '@/ui/useTheme';

/** Only a town name leaves the device: digits and extra text are removed, and nothing is sent while typing. */
export function sanitizeCityQuery(q: string): string {
  return q
    .replace(/[0-9@#/\\:;,_+=<>{}[\]|"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

/** City search via geocoding (no GPS, D-006). Runs only when she taps Search, and only with parent consent (D-035). */
export function CitySearch({ value, onPick, consented }: { value?: City; onPick: (c: City) => void; consented: boolean }) {
  const { t, locale, searchCity } = useApp();
  const c = useTheme();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<City[] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const query = sanitizeCityQuery(q);

  const search = async () => {
    if (query.length < 2) return;
    setState('loading');
    try {
      setResults(await searchCity(query, locale, consented));
      setState('idle');
    } catch {
      setState('error');
    }
  };

  return (
    <View style={{ gap: space.sm }}>
      {value && <T muted>{t('city.current', { city: value.name })}</T>}
      <T variant="small" muted>
        {t('city.onlyTown')}
      </T>
      <TextInput
        accessibilityLabel={t('city.searchLabel')}
        value={q}
        onChangeText={(v) => {
          setQ(v.slice(0, 40));
          setResults(null);
        }}
        onSubmitEditing={search}
        returnKeyType="search"
        maxLength={40}
        placeholder={t('city.placeholder')}
        placeholderTextColor={c.textMuted}
        autoCorrect={false}
        autoComplete="off"
        style={{
          minHeight: TAP + 4,
          borderRadius: radius.sm,
          borderWidth: 1.5,
          borderColor: c.border,
          color: c.text,
          backgroundColor: c.surface,
          fontSize: 17,
          paddingHorizontal: space.lg,
        }}
      />
      <Button kind="secondary" icon="🔎" label={t('city.search')} onPress={search} disabled={query.length < 2 || state === 'loading'} />
      {state === 'loading' && <ActivityIndicator color={c.primary} accessibilityLabel={t('common.loading')} />}
      {state === 'error' && <T muted>{t('city.offline')}</T>}
      {state === 'idle' && results?.length === 0 && <T muted>{t('city.none')}</T>}
      <View style={{ gap: space.sm }}>
        {(results ?? []).map((r) => (
          <Chip
            key={`${r.lat},${r.lon},${r.name}`}
            label={r.label ? `${r.name} · ${r.label}` : r.name}
            selected={value?.lat === r.lat && value?.lon === r.lon}
            onPress={() => {
              onPick(r);
              setQ('');
              setResults(null);
            }}
          />
        ))}
      </View>
    </View>
  );
}

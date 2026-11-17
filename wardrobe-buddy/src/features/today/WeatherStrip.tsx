import { ActivityIndicator, Text, View } from 'react-native';

import type { WeatherDay } from '@/domain/types';
import { isRainy, isWindy, manualWeatherDay, type ManualWeather } from '@/engine';
import { useApp } from '@/features/app/AppState';
import { formatNumber, formatTemp, formatTime } from '@/i18n';
import { Card, Chip, Row, T } from '@/ui/components';

export function weatherGlyph(d: WeatherDay): string {
  if (d.snow) return '❄️';
  if (isRainy(d)) return '🌧️';
  if (isWindy(d)) return '🌬️';
  if (d.uvMax >= 3) return '☀️';
  return '⛅';
}

/** Weather card for today. Falls back to "What's it like outside?" when there is no forecast. */
export function WeatherStrip({ day }: { day: WeatherDay | null }) {
  const { t, locale, profile, weatherStatus, forecast, setManualToday, refreshWeather, today } = useApp();

  if (!day) {
    if (weatherStatus === 'loading') {
      return (
        <Card>
          <ActivityIndicator accessibilityLabel={t('common.loading')} />
        </Card>
      );
    }
    const pick = (k: ManualWeather) => setManualToday(manualWeatherDay(today, k));
    return (
      <Card alt>
        <T variant="heading">{t('weather.askTitle')}</T>
        {!profile?.city && <T muted>{t('weather.noCity')}</T>}
        {profile?.city && weatherStatus === 'none' && <T muted>{t('weather.offline')}</T>}
        <Row wrap>
          <Chip icon="☀️" label={t('weather.sunny')} onPress={() => pick('sunny')} />
          <Chip icon="🌧️" label={t('weather.rainy')} onPress={() => pick('rainy')} />
          <Chip icon="🥶" label={t('weather.cold')} onPress={() => pick('cold')} />
        </Row>
        {profile?.city && <Chip icon="🔄" label={t('weather.retry')} onPress={() => refreshWeather(true)} />}
      </Card>
    );
  }

  return (
    <Card alt>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flexShrink: 1 }}>
          <T variant="label" muted>
            {day.manual ? t('weather.yourGuess') : (profile?.city?.name ?? '')}
          </T>
          <T variant="title">{t('weather.feels', { temp: formatTemp(day.feelsMinC, locale) })}</T>
        </View>
        <Text style={{ fontSize: 44 }} importantForAccessibility="no" accessibilityElementsHidden>
          {weatherGlyph(day)}
        </Text>
      </Row>
      {!day.manual && (
        <Row wrap gap={16}>
          <T variant="small">{t('weather.range', { min: formatTemp(day.tempMinC, locale), max: formatTemp(day.tempMaxC, locale) })}</T>
          <T variant="small">{t('weather.rainChance', { pct: formatNumber(day.rainChanceMaxPct, locale) })}</T>
          <T variant="small">{t('weather.wind', { kmh: formatNumber(day.windMaxKmh, locale) })}</T>
          <T variant="small">{t('weather.uv', { uv: formatNumber(day.uvMax, locale) })}</T>
        </Row>
      )}
      {weatherStatus === 'stale' && forecast && (
        <T variant="small" muted>
          {t('weather.stale', { time: formatTime(forecast.fetchedAt, locale) })}
        </T>
      )}
      {day.manual && <Chip icon="↩️" label={t('weather.clearGuess')} onPress={() => setManualToday(null)} />}
    </Card>
  );
}

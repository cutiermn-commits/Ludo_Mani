import { useMemo } from 'react';
import { View } from 'react-native';

import type { ClothingItem } from '@/domain/types';
import { planWeek } from '@/engine';
import { useApp } from '@/features/app/AppState';
import { EXTRA_ICON, TIP_KEY } from '@/features/today/text';
import { weatherGlyph } from '@/features/today/WeatherStrip';
import { ItemTile } from '@/features/wardrobe/visuals';
import { formatTemp, formatWeekday, type TKey } from '@/i18n';
import { Card, Row, Screen, T } from '@/ui/components';
import { space } from '@/ui/theme';

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

export default function Week() {
  const { t, locale, profile, items, outfits, learning, forecast, today } = useApp();
  const sameCity = !!forecast && forecast.lat === profile?.city?.lat && forecast.lon === profile?.city?.lon;
  const days = useMemo(() => (sameCity && forecast ? forecast.days : []).filter((d) => d.date >= today).slice(0, 7), [forecast, sameCity, today]);
  const history = useMemo(() => outfits.map((o) => ({ date: o.date, itemIds: o.itemIds })), [outfits]);
  const plan = useMemo(() => (profile && days.length ? planWeek(days, { items, profile, history, learning }) : []), [days, items, profile, history, learning]);

  if (!profile) return null;
  if (plan.length === 0) {
    return (
      <Screen>
        <T variant="title">{t('week.title')}</T>
        <Card alt>
          <T>{profile.city ? t('week.noForecast') : t('week.noCity')}</T>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <T variant="title">{t('week.title')}</T>
      <T muted>{t('week.subtitle')}</T>
      {plan.map((p) => {
        const top = p.result.outfits[0];
        const its = (top?.itemIds ?? []).map((id) => items.find((i) => i.id === id)).filter((i): i is ClothingItem => !!i);
        return (
          <Card key={p.date}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="heading">{p.date === today ? t('week.today') : capitalize(formatWeekday(p.date, locale))}</T>
              <T variant="label">
                {weatherGlyph(p.weather)} {formatTemp(p.weather.feelsMinC, locale)} – {formatTemp(p.weather.feelsMaxC, locale)}
              </T>
            </Row>
            {its.length > 0 ? (
              <Row wrap>
                {its.map((i) => (
                  <ItemTile key={i.id} item={i} size={64} showName={false} />
                ))}
              </Row>
            ) : (
              p.result.tips.slice(0, 1).map((tip) => (
                <T key={tip} muted>
                  {t(TIP_KEY[tip])}
                </T>
              ))
            )}
            {p.result.extras.length > 0 && (
              <View accessible style={{ flexDirection: 'row', gap: space.xs }} accessibilityLabel={t('week.extras', { list: p.result.extras.map((e) => t(`extra.${e}` as TKey)).join(', ') })}>
                <T variant="small" muted>
                  {p.result.extras.map((e) => EXTRA_ICON[e]).join(' ')}
                </T>
              </View>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

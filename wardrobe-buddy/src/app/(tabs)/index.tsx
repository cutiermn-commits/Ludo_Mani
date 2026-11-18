import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { nudgeFit, toggleWorn } from '@/domain/fit/place';
import type { Category, ClothingItem } from '@/domain/types';
import { useApp, useTodayWeather } from '@/features/app/AppState';
import { newId } from '@/features/app/dates';
import { TryOnPhoto } from '@/features/fit/TryOnPhoto';
import { Avatar } from '@/features/me/Avatar';
import { WeatherLine } from '@/features/today/WeatherStrip';
import { ItemTile, itemIcon, useItemName } from '@/features/wardrobe/visuals';
import type { TKey } from '@/i18n';
import { Button, Card, Chip, Row, Screen, Section, T } from '@/ui/components';
import { DropIn } from '@/ui/motion';
import { space } from '@/ui/theme';

/** The rows she picks from, top to toe (her sketch: T-shirts / Pants / Shorts tabs, generalised). */
const ROWS: Category[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes'];
const STEP = 0.06;

/**
 * "My day" (owner's simple flow, D-061): she picks clothes from her wardrobe and sees them worn by
 * her avatar or on her own photo. No automatic suggestions, moods or ratings.
 */
export default function Today() {
  const { t, profile, items, outfits, saveOutfit, updateItem, updateProfile, today } = useApp();
  const weather = useTodayWeather();
  const nameOf = useItemName();
  const { width: screenW } = useWindowDimensions();
  const saved = outfits.find((o) => o.date === today);
  const [worn, setWorn] = useState<string[] | null>(null);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  if (!profile) return null;

  const wornIds = (worn ?? saved?.itemIds ?? []).filter((id) => items.some((i) => i.id === id));
  const current = wornIds.map((id) => items.find((i) => i.id === id)).filter((i): i is ClothingItem => !!i);
  const photo = profile.useSelfie && profile.selfieUri ? profile.selfieUri : undefined;
  const previewW = Math.min(300, screenW - space.lg * 4);
  const label = current.length ? t('avatar.wearing', { items: current.map(nameOf).join(', ') }) : t('today.wearingNothing');
  const adjustItem = current.find((i) => i.id === adjusting && i.cutoutUri);

  const choose = (next: string[]) => {
    setWorn(next);
    // Her choice for today is kept, so it's still there when she opens the app again.
    void saveOutfit({ id: saved?.id ?? newId(), date: today, itemIds: next, extras: [], source: 'manual' });
  };
  const nudge = (item: ClothingItem, delta: { dx?: number; dy?: number; scale?: number }) => void updateItem(item.id, (i) => ({ ...i, fit: nudgeFit(i.fit, delta) }));

  if (items.length === 0) {
    return (
      <Screen>
        <T variant="title">{t('today.hello', { name: profile.nickname })}</T>
        <WeatherLine day={weather} />
        <Card alt>
          <T variant="heading">{t('today.emptyTitle')}</T>
          <T>{t('today.emptyBody')}</T>
          <Button icon="➕" label={t('today.addClothes')} onPress={() => router.push('/item/new')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <T variant="title">{t('today.hello', { name: profile.nickname })}</T>
      <WeatherLine day={weather} />

      <Row wrap style={{ justifyContent: 'center' }}>
        <Chip icon="🧍" label={t('today.showAvatar')} selected={!photo} onPress={() => updateProfile({ useSelfie: false })} />
        <Chip icon="📸" label={t('today.showPhoto')} selected={!!photo} onPress={() => (profile.selfieUri ? updateProfile({ useSelfie: true }) : router.push('/me'))} />
      </Row>

      <Card style={{ alignItems: 'center' }}>
        <DropIn trigger={wornIds.join(',')}>
          {photo ? (
            <TryOnPhoto uri={photo} aspect={profile.photoAspect} pose={profile.photoPose} outfit={current} width={previewW} label={label} />
          ) : (
            <Avatar look={profile.avatar} outfit={current} size={Math.round(previewW * 1.3)} label={label} />
          )}
        </DropIn>
        {photo && !profile.photoPose && (
          <T variant="small" muted center>
            {t('today.photoNoPoints')}
          </T>
        )}
        {current.some((i) => !i.cutoutUri) && (
          <T variant="small" muted center>
            {t('today.someNotCut')}
          </T>
        )}
        {current.some((i) => i.cutoutUri) && (
          <>
            <T variant="label">{t('today.adjustTitle')}</T>
            <Row wrap style={{ justifyContent: 'center' }}>
              {current
                .filter((i) => i.cutoutUri)
                .map((i) => (
                  <Chip
                    key={i.id}
                    icon={itemIcon(i)}
                    label={i.subcategory ? t(`sub.${i.subcategory}` as TKey) : t(`cat.${i.category}` as TKey)}
                    selected={adjusting === i.id}
                    onPress={() => setAdjusting(adjusting === i.id ? null : i.id)}
                  />
                ))}
            </Row>
          </>
        )}
        {adjustItem && (
          <View style={{ gap: space.sm, alignItems: 'center' }}>
            <Row wrap style={{ justifyContent: 'center' }}>
              <Chip icon="⬆️" label={t('fit.up')} onPress={() => nudge(adjustItem, { dy: -STEP })} />
              <Chip icon="⬇️" label={t('fit.down')} onPress={() => nudge(adjustItem, { dy: STEP })} />
              <Chip icon="⬅️" label={t('fit.left')} onPress={() => nudge(adjustItem, { dx: -STEP })} />
              <Chip icon="➡️" label={t('fit.right')} onPress={() => nudge(adjustItem, { dx: STEP })} />
            </Row>
            <Row wrap style={{ justifyContent: 'center' }}>
              <Chip icon="➖" label={t('fit.smaller')} onPress={() => nudge(adjustItem, { scale: 1 / 1.06 })} />
              <Chip icon="➕" label={t('fit.bigger')} onPress={() => nudge(adjustItem, { scale: 1.06 })} />
              <Chip icon="↺" label={t('fit.reset')} onPress={() => void updateItem(adjustItem.id, (i) => ({ ...i, fit: undefined }))} />
            </Row>
          </View>
        )}
        {current.length > 0 && <Chip icon="🧺" label={t('today.takeOff')} onPress={() => choose([])} />}
      </Card>

      {ROWS.filter((cat) => items.some((i) => i.category === cat)).map((cat) => (
        <Section key={cat} title={t(`catPlural.${cat}` as TKey)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.md, alignItems: 'flex-start' }}>
            {items
              .filter((i) => i.category === cat)
              .map((i) => (
                <ItemTile key={i.id} item={i} size={84} selected={wornIds.includes(i.id)} onPress={() => choose(toggleWorn(wornIds, i, items))} a11yHint={t('today.pickHint')} />
              ))}
          </ScrollView>
        </Section>
      ))}
      <Button kind="secondary" icon="➕" label={t('today.addClothes')} onPress={() => router.push('/item/new')} />
    </Screen>
  );
}

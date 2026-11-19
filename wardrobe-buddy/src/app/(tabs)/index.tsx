import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { nudgeFit, toggleWorn } from '@/domain/fit/place';
import { pickReaction, type Cue } from '@/domain/reactions';
import type { Category, ClothingItem } from '@/domain/types';
import { useApp, useTodayWeather } from '@/features/app/AppState';
import { newId } from '@/features/app/dates';
import { TryOnPhoto } from '@/features/fit/TryOnPhoto';
import { Avatar } from '@/features/me/Avatar';
import { Lively, type LivelyHandle } from '@/features/me/Lively';
import { Hanger, Mirror, Rail } from '@/features/today/Mirror';
import { WeatherLine } from '@/features/today/WeatherStrip';
import { ItemTile, itemIcon, useItemName } from '@/features/wardrobe/visuals';
import type { TKey } from '@/i18n';
import { Button, Card, Chip, Row, Screen, T } from '@/ui/components';
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
  /** An item in the wash she tried to pick: ask if it's clean now. */
  const [washAsk, setWashAsk] = useState<string | null>(null);
  const lively = useRef<LivelyHandle>(null);
  const lastLine = useRef<string | undefined>(undefined);
  const react = (cue: Cue) => {
    const r = pickReaction(cue, Math.random, lastLine.current);
    lastLine.current = r.say;
    lively.current?.react(r, t(r.say as TKey));
  };
  // A little hello when she opens her mirror.
  useEffect(() => {
    const id = setTimeout(() => {
      const r = pickReaction('hello');
      lively.current?.react(r, t(r.say as TKey));
    }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit
  }, []);
  if (!profile) return null;

  const wornIds = (worn ?? saved?.itemIds ?? []).filter((id) => items.some((i) => i.id === id));
  const current = wornIds.map((id) => items.find((i) => i.id === id)).filter((i): i is ClothingItem => !!i);
  const photo = profile.useSelfie && profile.selfieUri ? profile.selfieUri : undefined;
  const previewW = Math.min(300, screenW - space.lg * 4);
  const label = current.length ? t('avatar.wearing', { items: current.map(nameOf).join(', ') }) : t('today.wearingNothing');
  const adjustItem = current.find((i) => i.id === adjusting && i.cutoutUri);

  const choose = (next: string[]) => {
    setWashAsk(null);
    if (next.length === 0) react('clear');
    else if (next.some((id) => !wornIds.includes(id))) react('wear');
    setWorn(next);
    // Her choice for today is kept, so it's still there when she opens the app again.
    void saveOutfit({ id: saved?.id ?? newId(), date: today, itemIds: next, extras: [], source: 'manual' });
  };
  const pick = (item: ClothingItem) => {
    if (item.inLaundry && !wornIds.includes(item.id)) {
      setWashAsk(item.id);
      react('wash');
      return;
    }
    choose(toggleWorn(wornIds, item, items));
  };
  const washItem = items.find((i) => i.id === washAsk);
  const nudge = (item: ClothingItem, delta: { dx?: number; dy?: number; scale?: number }) => void updateItem(item.id, (i) => ({ ...i, fit: nudgeFit(i.fit, delta) }));

  return (
    <Screen>
      <T variant="title">{t('today.hello', { name: profile.nickname })}</T>
      <WeatherLine day={weather} />

      <Row wrap style={{ justifyContent: 'center' }}>
        <Chip icon="🧍" label={t('today.showAvatar')} selected={!photo} onPress={() => updateProfile({ useSelfie: false })} />
        <Chip icon="📸" label={t('today.showPhoto')} selected={!!photo} onPress={() => (profile.selfieUri ? updateProfile({ useSelfie: true }) : router.push('/me'))} />
      </Row>

      <View style={{ alignItems: 'center' }}>
        <Mirror width={previewW + 20}>
          <Lively ref={lively} move={!photo} onTap={() => react('tap')} tapLabel={`${label}. ${t('today.tapMe')}`}>
            {(face, blink) => (
              <DropIn trigger={wornIds.join(',')}>
                {photo ? (
                  <TryOnPhoto uri={photo} aspect={profile.photoAspect} pose={profile.photoPose} outfit={current} width={previewW - 20} label="" />
                ) : (
                  <Avatar look={profile.avatar} outfit={current} size={Math.round(previewW * 1.2)} label="" face={face} blink={blink} />
                )}
              </DropIn>
            )}
          </Lively>
        </Mirror>
      </View>
      <Card style={{ alignItems: 'center' }}>
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
        {current.length === 0 && !(photo && !profile.photoPose) && (
          <T variant="small" muted center>
            {t('today.wearingNothing')}
          </T>
        )}
      </Card>


      {items.length > 0 && <T variant="heading">👚 {t('today.railTitle')}</T>}
      {ROWS.filter((cat) => items.some((i) => i.category === cat)).map((cat) => (
        <View key={cat} style={{ gap: space.xs }}>
          <T variant="label" muted>
            {t(`catPlural.${cat}` as TKey)}
          </T>
          <Rail>
            {items
              .filter((i) => i.category === cat)
              .map((i) => (
                <View key={i.id} style={{ alignItems: 'center' }}>
                  <Hanger width={84} />
                  <ItemTile item={i} size={84} selected={wornIds.includes(i.id)} onPress={() => pick(i)} a11yHint={t('today.pickHint')} />
                </View>
              ))}
          </Rail>
          {washItem?.category === cat && (
            <Card alt style={{ alignItems: 'center' }}>
              <T center>{t('wardrobe.washSwitch', { name: nameOf(washItem) })} 🫧</T>
              <Row wrap style={{ justifyContent: 'center' }}>
                <Chip
                  icon="✨"
                  label={t('today.cleanNow')}
                  onPress={() => {
                    void updateItem(washItem.id, (i) => ({ ...i, inLaundry: false }));
                    choose(toggleWorn(wornIds, washItem, items));
                  }}
                />
                <Chip icon="✖️" label={t('common.cancel')} onPress={() => setWashAsk(null)} />
              </Row>
            </Card>
          )}
        </View>
      ))}
      {items.length === 0 && (
        <T muted center>
          {t('today.emptyBody')}
        </T>
      )}
      {/* Adding clothes lives only in the Wardrobe tab (owner, 2026-11-19); here she just goes there to pick. */}
      <Button kind={items.length ? 'secondary' : 'primary'} icon="👚" label={t('today.chooseFromWardrobe')} onPress={() => router.navigate('/wardrobe')} />
    </Screen>
  );
}

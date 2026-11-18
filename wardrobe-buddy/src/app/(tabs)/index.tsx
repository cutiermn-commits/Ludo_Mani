import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { MOODS, type Category, type ClothingItem, type Mood, type Outfit } from '@/domain/types';
import { suggest, swapIn } from '@/engine';
import { useApp, useTodayWeather } from '@/features/app/AppState';
import { newId } from '@/features/app/dates';
import { Avatar } from '@/features/me/Avatar';
import { OutfitStack } from '@/features/me/OutfitStack';
import { SelfieImage } from '@/features/me/SelfieCard';
import { EXTRA_ICON, TIP_KEY, useWhyText } from '@/features/today/text';
import { WeatherStrip } from '@/features/today/WeatherStrip';
import { ItemTile, useItemName } from '@/features/wardrobe/visuals';
import type { TKey } from '@/i18n';
import { Button, Card, Chip, Row, Screen, Section, T } from '@/ui/components';
import { DropIn } from '@/ui/motion';
import { space } from '@/ui/theme';

const MOOD_ICON: Record<Mood, string> = { happy: '😊', cozy: '🧸', sporty: '⚡', fancy: '✨', chill: '😌' };
/** Swap tabs from her sketch (T-shirts / Pants / Shorts), generalised to categories. */
const SWAP_TABS: Category[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes'];

export default function Today() {
  const app = useApp();
  const { t, profile, items, outfits, ratings, learning, mood, setMood, saveOutfit, today } = app;
  const weather = useTodayWeather();
  const why = useWhyText();
  const nameOf = useItemName();
  const [alt, setAlt] = useState(0);
  const [edits, setEdits] = useState<string[] | null>(null);
  const [swapTab, setSwapTab] = useState<Category>('top');

  const history = useMemo(() => outfits.map((o) => ({ date: o.date, itemIds: o.itemIds })), [outfits]);
  const result = useMemo(
    () =>
      profile
        ? suggest({ date: today, items, profile, weather, mood, history, learning })
        : null,
    [profile, today, items, weather, mood, history, learning],
  );
  const saved = outfits.find((o) => o.date === today);
  const rated = saved ? ratings.some((r) => r.outfitId === saved.id) : false;

  if (!profile || !result) return null;

  // Once today's outfit is saved, "another idea" should not repeat it.
  const options = saved ? result.outfits.filter((o) => o.itemIds.join() !== saved.itemIds.join()) : result.outfits;
  const suggestion = options[Math.min(alt, Math.max(0, options.length - 1))];
  const currentIds = edits ?? suggestion?.itemIds ?? [];
  const current = currentIds.map((id) => items.find((i) => i.id === id)).filter((i): i is ClothingItem => !!i);
  const showAvatar = profile.uiStyle === 'playful';

  const swap = (item: ClothingItem) => setEdits(swapIn(currentIds, item, items));

  const wear = async () => {
    const o: Outfit = {
      id: newId(),
      date: today,
      itemIds: currentIds,
      extras: result.extras,
      mood,
      weatherSnapshot: weather ?? undefined,
      source: edits ? 'edited' : 'suggested',
    };
    await saveOutfit(o);
    setEdits(null);
  };

  return (
    <Screen>
      <T variant="title">{t('today.hello', { name: profile.nickname })}</T>
      <WeatherStrip day={weather} />

      <Section title={t('today.moodTitle')}>
        <Row wrap>
          {MOODS.map((m) => (
            <Chip
              key={m}
              icon={showAvatar ? MOOD_ICON[m] : undefined}
              label={t(`mood.${m}` as TKey)}
              selected={mood === m}
              onPress={() => {
                setMood(mood === m ? undefined : m);
                setAlt(0);
                setEdits(null);
              }}
            />
          ))}
        </Row>
      </Section>

      {saved && (
        <Card>
          <T variant="heading">{t('today.savedTitle')}</T>
          <Row wrap style={{ alignItems: 'flex-start' }}>
            {saved.itemIds.map((id) => {
              const it = items.find((i) => i.id === id);
              return it ? <ItemTile key={id} item={it} size={84} /> : null;
            })}
          </Row>
          {rated ? <T muted>{t('today.thanksRated')}</T> : <Button icon="⭐" label={t('today.rate')} onPress={() => router.push(`/rate/${saved.id}`)} />}
        </Card>
      )}

      {result.tips.map((tip) => (
        <Card key={tip} alt>
          <T>{t(TIP_KEY[tip])}</T>
          {(tip === 'emptyWardrobe' || tip.startsWith('add')) && <Button kind="secondary" label={t('today.addClothes')} onPress={() => router.push('/item/new')} />}
        </Card>
      ))}

      {suggestion && (
        <Card>
          <T variant="heading">{saved ? t('today.otherIdea') : t('today.suggestionTitle')}</T>
          <DropIn trigger={currentIds.join(',')}>
            <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
              {profile.useSelfie && profile.selfieUri ? (
                <View style={{ gap: space.sm, alignItems: 'center' }}>
                  <SelfieImage uri={profile.selfieUri} size={120} label={t('selfie.a11y')} />
                  <OutfitStack items={current} width={110} label={t('avatar.wearing', { items: current.map(nameOf).join(', ') })} />
                </View>
              ) : showAvatar ? (
                <Avatar look={profile.avatar} outfit={current} size={190} label={t('avatar.wearing', { items: current.map(nameOf).join(', ') })} />
              ) : (
                <OutfitStack items={current} width={140} label={t('avatar.wearing', { items: current.map(nameOf).join(', ') })} />
              )}
              <View style={{ flex: 1, gap: space.sm }}>
                <Row wrap style={{ alignItems: 'flex-start' }}>
                  {current.map((it) => (
                    <ItemTile key={it.id} item={it} size={showAvatar ? 72 : 96} />
                  ))}
                </Row>
              </View>
            </View>
          </DropIn>
          {!edits && (
            <View accessibilityRole="summary" style={{ gap: 2 }}>
              <T variant="label">{t('today.why')}</T>
              <T>{why(suggestion.reasons, items)}</T>
            </View>
          )}
          {result.extras.length > 0 && (
            <>
              <T variant="label">{t('today.dontForget')}</T>
              <Row wrap>
                {result.extras.map((e) => (
                  <Chip key={e} icon={EXTRA_ICON[e]} label={t(`extra.${e}` as TKey)} />
                ))}
              </Row>
            </>
          )}
          <Button icon="👍" label={t('today.wear')} onPress={wear} />
          <Row wrap style={{ justifyContent: 'center' }}>
            {options.length > 1 && (
              <Chip
                icon="🔀"
                label={t('today.another')}
                onPress={() => {
                  setAlt((alt + 1) % options.length);
                  setEdits(null);
                }}
              />
            )}
            {edits && <Chip icon="↩️" label={t('today.undo')} onPress={() => setEdits(null)} />}
          </Row>
        </Card>
      )}

      {suggestion && (
        <Section title={t('today.swapTitle')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.sm, alignItems: 'center' }}>
            {SWAP_TABS.filter((c) => items.some((i) => i.category === c)).map((c) => (
              <Chip key={c} label={t(`catPlural.${c}` as TKey)} selected={swapTab === c} onPress={() => setSwapTab(c)} />
            ))}
          </ScrollView>
          <Row wrap gap={space.md} style={{ alignItems: 'flex-start' }}>
            {items
              .filter((i) => i.category === swapTab && !i.inLaundry)
              .map((i) => (
                <ItemTile key={i.id} item={i} size={88} selected={currentIds.includes(i.id)} onPress={() => swap(i)} a11yHint={t('today.swapHint')} />
              ))}
          </Row>
        </Section>
      )}
    </Screen>
  );
}

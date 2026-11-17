import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, Text } from 'react-native';

import { RATING_REASONS, type ClothingItem, type RatingReason } from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import { DiaryPhotoCard } from '@/features/me/DiaryPhotoCard';
import { ItemTile } from '@/features/wardrobe/visuals';
import type { TKey } from '@/i18n';
import { Button, Card, Chip, Row, Screen, T } from '@/ui/components';
import { useTheme } from '@/ui/useTheme';

const REASON_ICON: Record<RatingReason, string> = { tooCold: '🥶', tooWarm: '🥵', notMyStyle: '🙅', loveIt: '♥', uncomfortable: '😣' };

/** 1–5 stars + quick reason chips (F9). No pressure: rating is optional. */
export default function Rate() {
  const { outfitId } = useLocalSearchParams<{ outfitId: string }>();
  const { t, outfits, items, rateOutfit } = useApp();
  const c = useTheme();
  const outfit = outfits.find((o) => o.id === outfitId);
  const [stars, setStars] = useState<1 | 2 | 3 | 4 | 5 | 0>(0);
  const [reasons, setReasons] = useState<RatingReason[]>([]);
  const [wore, setWore] = useState(true);

  if (!outfit) {
    return (
      <Screen>
        <T>{t('rate.missing')}</T>
      </Screen>
    );
  }
  const its = outfit.itemIds.map((id) => items.find((i) => i.id === id)).filter((i): i is ClothingItem => !!i);

  const save = async () => {
    if (stars === 0) return;
    await rateOutfit({ outfitId: outfit.id, stars, reasons, wore, createdAt: new Date().toISOString() });
    router.back();
  };

  return (
    <Screen>
      <Row wrap style={{ alignItems: 'flex-start' }}>
        {its.map((i) => (
          <ItemTile key={i.id} item={i} size={72} />
        ))}
      </Row>
      <Card>
        <T variant="heading">{t('rate.question')}</T>
        <Row style={{ justifyContent: 'center' }}>
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={t('rate.starsA11y', { n })}
              accessibilityState={{ selected: stars === n }}
              onPress={() => setStars(n)}
              style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 36, color: n <= stars ? '#E8A317' : c.textMuted }}>{n <= stars ? '★' : '☆'}</Text>
            </Pressable>
          ))}
        </Row>
        <Row wrap>
          {RATING_REASONS.map((r) => (
            <Chip
              key={r}
              icon={REASON_ICON[r]}
              label={t(`rate.reason.${r}` as TKey)}
              selected={reasons.includes(r)}
              onPress={() => setReasons(reasons.includes(r) ? reasons.filter((x) => x !== r) : [...reasons, r])}
            />
          ))}
        </Row>
        <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
          <T>{t('rate.wore')}</T>
          <Switch accessibilityLabel={t('rate.wore')} value={wore} onValueChange={setWore} trackColor={{ true: c.primary, false: c.border }} />
        </Row>
      </Card>
      <DiaryPhotoCard outfitId={outfit.id} />
      <Button label={t('common.save')} onPress={save} disabled={stars === 0} />
    </Screen>
  );
}

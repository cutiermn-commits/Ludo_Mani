import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { CATEGORIES, type Category } from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import { ItemTile } from '@/features/wardrobe/visuals';
import type { TKey } from '@/i18n';
import { Button, Card, Chip, Row, Screen, T } from '@/ui/components';
import { space } from '@/ui/theme';

export default function Wardrobe() {
  const { t, items, upsertItem } = useApp();
  const [filter, setFilter] = useState<Category | 'all' | 'wash'>('all');

  const shown = items.filter((i) => (filter === 'all' ? true : filter === 'wash' ? i.inLaundry : i.category === filter));
  const sorted = [...shown].sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || b.createdAt.localeCompare(a.createdAt));

  return (
    <Screen>
      <T variant="title">{t('wardrobe.title')}</T>
      <Button icon="➕" label={t('wardrobe.add')} onPress={() => router.push('/item/new')} />

      {items.length === 0 ? (
        <Card alt>
          <T variant="heading">{t('wardrobe.emptyTitle')}</T>
          <T>{t('wardrobe.emptyBody')}</T>
          <T muted>{t('wardrobe.photoTip')}</T>
        </Card>
      ) : (
        <>
          {items.length < 5 && (
            <Card alt>
              <T>{t('wardrobe.firstFive', { n: items.length })}</T>
            </Card>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.sm, alignItems: 'center' }}>
            <Chip label={t('wardrobe.all')} selected={filter === 'all'} onPress={() => setFilter('all')} />
            {CATEGORIES.filter((c) => items.some((i) => i.category === c)).map((c) => (
              <Chip key={c} label={t(`catPlural.${c}` as TKey)} selected={filter === c} onPress={() => setFilter(c)} />
            ))}
            <Chip icon="🧺" label={t('wardrobe.inWash')} selected={filter === 'wash'} onPress={() => setFilter('wash')} />
          </ScrollView>
          <Row wrap gap={space.lg} style={{ alignItems: 'flex-start' }}>
            {sorted.map((i) => (
              <ItemTile
                key={i.id}
                item={i}
                onPress={() => router.push(`/item/${i.id}`)}
                a11yHint={t('wardrobe.editHint')}
                onToggleFavorite={() => upsertItem({ ...i, favorite: !i.favorite })}
              />
            ))}
          </Row>
          {sorted.length === 0 && <T muted>{t('wardrobe.noneHere')}</T>}
        </>
      )}
    </Screen>
  );
}

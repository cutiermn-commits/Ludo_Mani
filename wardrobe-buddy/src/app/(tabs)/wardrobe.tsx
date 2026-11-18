import { router } from 'expo-router';

import { CATEGORIES } from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import { ItemTile } from '@/features/wardrobe/visuals';
import type { TKey } from '@/i18n';
import { Button, Card, Row, Screen, Section, T } from '@/ui/components';
import { space } from '@/ui/theme';

/** Step 2 of the simple flow (D-061): all her clothes, grouped by type. Tap to change, ➕ to add. */
export default function Wardrobe() {
  const { t, items } = useApp();

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
        CATEGORIES.filter((c) => items.some((i) => i.category === c)).map((c) => (
          <Section key={c} title={t(`catPlural.${c}` as TKey)}>
            <Row wrap gap={space.lg} style={{ alignItems: 'flex-start' }}>
              {items
                .filter((i) => i.category === c)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((i) => (
                  <ItemTile key={i.id} item={i} onPress={() => router.push(`/item/${i.id}`)} a11yHint={t('wardrobe.editHint')} />
                ))}
            </Row>
          </Section>
        ))
      )}
    </Screen>
  );
}

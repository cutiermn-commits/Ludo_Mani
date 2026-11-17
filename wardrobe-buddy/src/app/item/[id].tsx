import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import {
  CATEGORIES,
  STYLE_TAGS,
  SUBCATEGORIES,
  type Category,
  type ClothingItem,
  type ColorName,
  type StyleTag,
  type Subcategory,
  type Warmth,
} from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import { newId } from '@/features/app/dates';
import { ColorPicker } from '@/features/me/pickers';
import { ItemTile, itemIcon } from '@/features/wardrobe/visuals';
import type { TKey } from '@/i18n';
import { Button, Card, Chip, Row, Screen, T } from '@/ui/components';
import { space } from '@/ui/theme';
import { useTheme } from '@/ui/useTheme';

/** Sensible starting warmth per type, so adding an item is 3 taps. ASSUMPTION. */
const DEFAULT_WARMTH: Partial<Record<Subcategory, Warmth>> = {
  tshirt: 1, top: 1, shirt: 2, sweater: 3, hoodie: 3, shorts: 1, skirt: 2, leggings: 2, jeans: 3, trousers: 3,
  dress: 2, cardigan: 2, raincoat: 2, jacket: 3, coat: 4, puffer: 5, sandals: 1, sneakers: 2, shoes: 2, boots: 4,
};

/** Add or edit a clothing item. Photo capture comes in Phase 3 (needs the camera permission — owner approval). */
export default function ItemEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, items, upsertItem, deleteItem } = useApp();
  const c = useTheme();
  const existing = items.find((i) => i.id === id);
  const [item, setItem] = useState<ClothingItem>(
    () =>
      existing ?? {
        id: newId(),
        category: 'top',
        subcategory: 'tshirt',
        colors: [],
        warmth: 1,
        waterproof: false,
        windproof: false,
        styleTags: [],
        occasions: ['school'],
        favorite: false,
        inLaundry: false,
        createdAt: new Date().toISOString(),
      },
  );
  const set = (p: Partial<ClothingItem>) => setItem((x) => ({ ...x, ...p }));

  const pickCategory = (cat: Category) => {
    const sub = SUBCATEGORIES[cat][0] as Subcategory;
    set({ category: cat, subcategory: sub, warmth: DEFAULT_WARMTH[sub] ?? item.warmth });
  };

  const save = async () => {
    await upsertItem(item);
    router.back();
  };

  const toggle = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
      <T>{label}</T>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: c.primary, false: c.border }} />
    </Row>
  );

  return (
    <Screen>
      <View style={{ alignItems: 'center' }}>
        <ItemTile item={item.colors.length ? item : { ...item, colors: ['grey'] }} size={140} />
      </View>

      <Card>
        <T variant="label">{t('item.category')}</T>
        <Row wrap>
          {CATEGORIES.map((cat) => (
            <Chip key={cat} icon={itemIcon({ category: cat })} label={t(`cat.${cat}` as TKey)} selected={item.category === cat} onPress={() => pickCategory(cat)} />
          ))}
        </Row>
        <T variant="label">{t('item.type')}</T>
        <Row wrap>
          {SUBCATEGORIES[item.category].map((sub) => (
            <Chip
              key={sub}
              label={t(`sub.${sub}` as TKey)}
              selected={item.subcategory === sub}
              onPress={() => set({ subcategory: sub, warmth: DEFAULT_WARMTH[sub] ?? item.warmth })}
            />
          ))}
        </Row>
      </Card>

      <Card>
        <T variant="label">{t('item.colors')}</T>
        <T variant="small" muted>
          {t('item.colorsHint')}
        </T>
        <ColorPicker value={item.colors} onChange={(colors: ColorName[]) => set({ colors: colors.slice(0, 3) })} labelKey="item.colorA11y" />
      </Card>

      <Card>
        <T variant="label">{t('item.warmth')}</T>
        <Row wrap>
          {([1, 2, 3, 4, 5] as Warmth[]).map((w) => (
            <Chip key={w} label={t(`warmth.${w}` as TKey)} selected={item.warmth === w} onPress={() => set({ warmth: w })} />
          ))}
        </Row>
        {(item.category === 'outerwear' || item.category === 'shoes') && (
          <>
            {toggle(t('item.waterproof'), item.waterproof, (v) => set({ waterproof: v }))}
            {item.category === 'outerwear' && toggle(t('item.windproof'), item.windproof, (v) => set({ windproof: v }))}
          </>
        )}
      </Card>

      <Card>
        <T variant="label">{t('item.style')}</T>
        <Row wrap>
          {STYLE_TAGS.map((tag: StyleTag) => (
            <Chip
              key={tag}
              label={t(`tag.${tag}` as TKey)}
              selected={item.styleTags.includes(tag)}
              onPress={() => set({ styleTags: item.styleTags.includes(tag) ? item.styleTags.filter((x) => x !== tag) : [...item.styleTags, tag] })}
            />
          ))}
        </Row>
        {toggle(t('item.favorite'), item.favorite, (v) => set({ favorite: v }))}
        {toggle(t('item.inWash'), item.inLaundry, (v) => set({ inLaundry: v }))}
      </Card>

      <Button label={t('common.save')} onPress={save} disabled={item.colors.length === 0} />
      {item.colors.length === 0 && (
        <T variant="small" muted center>
          {t('item.needColor')}
        </T>
      )}
      {existing && (
        <Button
          kind="danger"
          label={t('item.delete')}
          onPress={async () => {
            await deleteItem(existing.id);
            router.back();
          }}
        />
      )}
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

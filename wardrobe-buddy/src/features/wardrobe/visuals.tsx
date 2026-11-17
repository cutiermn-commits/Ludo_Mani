import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Category, ClothingItem, ColorName, Subcategory } from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import type { TKey } from '@/i18n';
import { T } from '@/ui/components';
import { CLOTHING_HEX, radius, space } from '@/ui/theme';
import { useTheme } from '@/ui/useTheme';

/** Emoji glyphs stand in for photos until photo capture lands (Phase 3). Decorative only. */
const SUB_ICON: Partial<Record<Subcategory, string>> = {
  tshirt: '👕',
  shirt: '👔',
  sweater: '🧶',
  hoodie: '🧥',
  top: '👚',
  jeans: '👖',
  trousers: '👖',
  shorts: '🩳',
  skirt: '🩱',
  leggings: '👖',
  dress: '👗',
  raincoat: '🧥',
  jacket: '🧥',
  coat: '🧥',
  puffer: '🧥',
  cardigan: '🧶',
  sneakers: '👟',
  boots: '🥾',
  sandals: '🩴',
  shoes: '👞',
  hat: '🧢',
  cap: '🧢',
  scarf: '🧣',
  gloves: '🧤',
  bag: '🎒',
};
const CAT_ICON: Record<Category, string> = { top: '👕', bottom: '👖', dress: '👗', outerwear: '🧥', shoes: '👟', accessory: '🧢' };

export function itemIcon(i: Pick<ClothingItem, 'category' | 'subcategory'>): string {
  return (i.subcategory && SUB_ICON[i.subcategory]) || CAT_ICON[i.category];
}

export function useItemName() {
  const { t } = useApp();
  return (i: Pick<ClothingItem, 'category' | 'subcategory' | 'colors'>) => {
    const kind = i.subcategory ? t(`sub.${i.subcategory}` as TKey) : t(`cat.${i.category}` as TKey);
    const color = i.colors[0] ? t(`color.${i.colors[0]}` as TKey) : '';
    return color ? t('item.name', { color, kind }) : kind;
  };
}

export function Swatch({ color, size = 28, selected }: { color: ColorName; size?: number; selected?: boolean }) {
  const c = useTheme();
  const multi = color === 'multi';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: CLOTHING_HEX[color],
        borderWidth: selected ? 3 : 1.5,
        borderColor: selected ? c.primary : c.border,
        overflow: 'hidden',
        flexDirection: 'row',
      }}>
      {multi && ['#F28DB5', '#F2CF3A', '#3C9A5F', '#2F6FE0'].map((h) => <View key={h} style={{ flex: 1, backgroundColor: h }} />)}
    </View>
  );
}

/** Tile for an item: photo if present, otherwise a colour block with the clothing glyph. */
export function ItemTile({
  item,
  size = 104,
  onPress,
  selected,
  onToggleFavorite,
  a11yHint,
  showName = true,
}: {
  showName?: boolean;
  item: ClothingItem;
  size?: number;
  onPress?: () => void;
  selected?: boolean;
  onToggleFavorite?: () => void;
  a11yHint?: string;
}) {
  const c = useTheme();
  const { t } = useApp();
  const name = useItemName()(item);
  const main = item.colors[0] ?? 'grey';
  return (
    <View style={{ width: size }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[name, item.favorite ? t('a11y.favorite') : '', item.inLaundry ? t('wardrobe.inWash') : ''].filter(Boolean).join(', ')}
        accessibilityHint={a11yHint}
        accessibilityState={{ selected: !!selected }}
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          tile.box,
          {
            width: size,
            height: size,
            backgroundColor: c.surfaceAlt,
            borderColor: selected ? c.primary : c.border,
            borderWidth: selected ? 3 : 1,
            opacity: item.inLaundry ? 0.55 : pressed ? 0.85 : 1,
          },
        ]}>
        {/* Photos arrive in Phase 3 (camera permission needs owner approval). */}
        <View style={[tile.blob, { backgroundColor: CLOTHING_HEX[main], width: size * 0.7, height: size * 0.7, borderRadius: size * 0.35 }]} />
        <Text style={{ fontSize: size * 0.42 }} importantForAccessibility="no" accessibilityElementsHidden>
          {itemIcon(item)}
        </Text>
        {item.inLaundry && (
          <Text style={tile.badge} importantForAccessibility="no" accessibilityElementsHidden>
            🧺
          </Text>
        )}
      </Pressable>
      {onToggleFavorite && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.favorite ? t('a11y.unfavorite', { name }) : t('a11y.makeFavorite', { name })}
          accessibilityState={{ selected: item.favorite }}
          onPress={onToggleFavorite}
          hitSlop={8}
          style={[tile.heart, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ fontSize: 18, color: item.favorite ? '#D6383A' : c.textMuted }}>{item.favorite ? '♥' : '♡'}</Text>
        </Pressable>
      )}
      {showName && (
        <T variant="small" muted style={{ marginTop: 4 }}>
          {name}
        </T>
      )}
    </View>
  );
}

const tile = StyleSheet.create({
  box: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  blob: { position: 'absolute', opacity: 0.85 },
  badge: { position: 'absolute', left: space.xs, top: space.xs, fontSize: 18 },
  heart: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

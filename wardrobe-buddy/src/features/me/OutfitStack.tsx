import { Image, View } from 'react-native';

import type { Category, ClothingItem } from '@/domain/types';
import { radius } from '@/ui/theme';

/**
 * Outfit "collage" (D-059): her real garments laid out like an outfit on the bed — used in the
 * clean (13–15) style, next to a selfie, and whenever the avatar isn't shown. Uses the cut-out
 * where there is one, otherwise the photo. Renders nothing if no item has a picture.
 */
const ROWS: Category[][] = [['outerwear', 'dress', 'top'], ['bottom'], ['shoes']];

export function OutfitStack({ items, width = 150, label }: { items: ClothingItem[]; width?: number; label: string }) {
  const pic = (i: ClothingItem) => i.cutoutUri ?? i.photoUri;
  const rows = ROWS.map((cats) => items.filter((i) => cats.includes(i.category) && pic(i))).filter((r) => r.length > 0);
  if (rows.length === 0) return null;
  const rowH = (cats: ClothingItem[]) => (cats[0].category === 'shoes' ? width * 0.35 : width * 0.62);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width, gap: 4, alignItems: 'center' }}>
      {rows.map((r) => (
        <View key={r[0].id} style={{ flexDirection: 'row', gap: 4, justifyContent: 'center', width }}>
          {r.map((i) => (
            <Image
              key={i.id}
              source={{ uri: pic(i)! }}
              resizeMode={i.cutoutUri ? 'contain' : 'cover'}
              importantForAccessibility="no"
              accessibilityElementsHidden
              style={{ width: (width - 4 * (r.length - 1)) / r.length, height: rowH(r), borderRadius: i.cutoutUri ? 0 : radius.sm }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

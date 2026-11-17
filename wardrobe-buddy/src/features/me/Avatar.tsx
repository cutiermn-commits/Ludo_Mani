import { View } from 'react-native';

import type { AvatarLook, ClothingItem } from '@/domain/types';
import { CLOTHING_HEX } from '@/ui/theme';

/** Original, simple shapes: no known characters, no body measurements (PRIVACY_SAFETY §2.6, §2.8). */
export const SKIN_TONES = ['#F6D7C3', '#EBC09F', '#D29E7A', '#A86F4C', '#7B4B2E', '#4E2F1C'];
export const HAIR_COLORS = ['#2B1B12', '#5A3A22', '#9B6A3C', '#D9B26A', '#B5442E', '#8B5CD6'];
export const HAIR_STYLES: AvatarLook['hairStyle'][] = ['short', 'long', 'ponytail', 'buns'];

export const DEFAULT_AVATAR: AvatarLook = { skin: 1, hair: 1, hairStyle: 'long' };

/**
 * Avatar "wearing" the outfit: torso takes the top (or dress) colour, legs the bottom,
 * a jacket shows as side panels, shoes at the bottom. Scales with `size` (height in px).
 */
export function Avatar({ look, outfit = [], size = 180, label }: { look: AvatarLook; outfit?: ClothingItem[]; size?: number; label: string }) {
  const u = size / 180;
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[1];
  const hair = HAIR_COLORS[look.hair] ?? HAIR_COLORS[1];
  const pick = (cat: ClothingItem['category']) => outfit.find((i) => i.category === cat);
  const dress = pick('dress');
  const top = dress ?? pick('top');
  const bottom = dress ?? pick('bottom');
  const outer = pick('outerwear');
  const shoes = pick('shoes');
  const hex = (i?: ClothingItem, fallback = '#E9E4EF') => (i ? CLOTHING_HEX[i.colors[0] ?? 'grey'] : fallback);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: 120 * u, height: size, alignItems: 'center' }}>
      {/* hair behind */}
      {(look.hairStyle === 'long' || look.hairStyle === 'ponytail') && (
        <View
          style={{
            position: 'absolute',
            top: 6 * u,
            width: look.hairStyle === 'long' ? 58 * u : 50 * u,
            height: look.hairStyle === 'long' ? 70 * u : 46 * u,
            borderRadius: 26 * u,
            backgroundColor: hair,
          }}
        />
      )}
      {look.hairStyle === 'ponytail' && (
        <View style={{ position: 'absolute', top: 18 * u, right: 30 * u, width: 14 * u, height: 40 * u, borderRadius: 7 * u, backgroundColor: hair }} />
      )}
      {look.hairStyle === 'buns' && (
        <>
          <View style={{ position: 'absolute', top: 2 * u, left: 34 * u, width: 18 * u, height: 18 * u, borderRadius: 9 * u, backgroundColor: hair }} />
          <View style={{ position: 'absolute', top: 2 * u, right: 34 * u, width: 18 * u, height: 18 * u, borderRadius: 9 * u, backgroundColor: hair }} />
        </>
      )}
      {/* head */}
      <View style={{ marginTop: 10 * u, width: 44 * u, height: 48 * u, borderRadius: 22 * u, backgroundColor: skin, overflow: 'hidden', alignItems: 'center' }}>
        <View style={{ width: 48 * u, height: (look.hairStyle === 'short' ? 16 : 13) * u, backgroundColor: hair, borderBottomLeftRadius: 10 * u, borderBottomRightRadius: 10 * u }} />
        <View style={{ flexDirection: 'row', gap: 12 * u, marginTop: 9 * u }}>
          <View style={{ width: 5 * u, height: 5 * u, borderRadius: 3 * u, backgroundColor: '#2B1B24' }} />
          <View style={{ width: 5 * u, height: 5 * u, borderRadius: 3 * u, backgroundColor: '#2B1B24' }} />
        </View>
        <View style={{ marginTop: 6 * u, width: 14 * u, height: 7 * u, borderBottomLeftRadius: 7 * u, borderBottomRightRadius: 7 * u, borderWidth: 2 * u, borderTopWidth: 0, borderColor: '#2B1B24' }} />
      </View>
      {/* neck */}
      <View style={{ width: 12 * u, height: 5 * u, backgroundColor: skin }} />
      {/* torso + arms */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ width: 12 * u, height: 48 * u, marginTop: 2 * u, borderRadius: 6 * u, backgroundColor: outer ? hex(outer) : hex(top) }} />
        <View style={{ width: 52 * u, height: dress ? 72 * u : 48 * u, backgroundColor: hex(top), borderTopLeftRadius: 12 * u, borderTopRightRadius: 12 * u, borderBottomLeftRadius: dress ? 4 * u : 0, borderBottomRightRadius: dress ? 4 * u : 0, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden' }}>
          {outer && (
            <>
              <View style={{ width: 14 * u, backgroundColor: hex(outer) }} />
              <View style={{ width: 14 * u, backgroundColor: hex(outer) }} />
            </>
          )}
        </View>
        <View style={{ width: 12 * u, height: 48 * u, marginTop: 2 * u, borderRadius: 6 * u, backgroundColor: outer ? hex(outer) : hex(top) }} />
      </View>
      {/* legs */}
      <View style={{ flexDirection: 'row', gap: 6 * u }}>
        {[0, 1].map((k) => (
          <View key={k} style={{ width: 20 * u, height: (dress ? 26 : 50) * u, backgroundColor: dress ? skin : hex(bottom), borderBottomLeftRadius: 4 * u, borderBottomRightRadius: 4 * u }} />
        ))}
      </View>
      {/* shoes */}
      <View style={{ flexDirection: 'row', gap: 4 * u }}>
        {[0, 1].map((k) => (
          <View key={k} style={{ width: 24 * u, height: 9 * u, borderRadius: 5 * u, backgroundColor: hex(shoes, '#6B6470') }} />
        ))}
      </View>
    </View>
  );
}

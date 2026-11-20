import { Image, View } from 'react-native';

import type { PlacedGarment } from '@/domain/fit/place';

/**
 * Draws worn garments (D-068), on the avatar and on her photo alike. A garment with turned sleeves
 * is drawn in pieces: each sleeve is cut out of the picture with a rectangle along the sleeve and
 * turned around the shoulder seam; the body is drawn on top, without the original sleeves.
 * Plain React Native views (clipping + transforms), no extra library. `u` = pixels per unit.
 */
export function GarmentLayer({ garments, u = 1 }: { garments: PlacedGarment[]; u?: number }) {
  return (
    <>
      {garments.map((g) => {
        const w = g.box.w * u;
        const h = g.box.h * u;
        const picture = (left: number, top: number) => (
          <Image source={{ uri: g.uri }} resizeMode="stretch" importantForAccessibility="no" accessibilityElementsHidden style={{ position: 'absolute', left, top, width: w, height: h }} />
        );
        if (!g.body) {
          return (
            <View key={g.itemId} pointerEvents="none" style={{ position: 'absolute', left: g.box.x * u, top: g.box.y * u, width: w, height: h }}>
              {picture(0, 0)}
            </View>
          );
        }
        const b = g.body;
        return (
          <View key={g.itemId} pointerEvents="none" style={{ position: 'absolute', left: g.box.x * u, top: g.box.y * u, width: w, height: h }}>
            {(g.sleeves ?? []).map((s, i) => (
              // Turned around the shoulder seam…
              <View
                key={i}
                style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: `${s.px * u}px ${s.py * u}px`, transform: [{ rotate: `${s.rot}deg` }] }}>
                {/* …a rectangle along the sleeve, clipping… */}
                <View
                  style={{
                    position: 'absolute',
                    left: s.sx * u,
                    top: s.sy * u,
                    width: s.len * u,
                    height: s.across * u,
                    overflow: 'hidden',
                    transformOrigin: '0px 0px',
                    transform: [{ rotate: `${s.phi}deg` }],
                  }}>
                  {/* …the garment picture, put back where it was. */}
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: w,
                      height: h,
                      transformOrigin: '0px 0px',
                      transform: [{ rotate: `${-s.phi}deg` }, { translateX: -s.sx * u }, { translateY: -s.sy * u }],
                    }}>
                    {picture(0, 0)}
                  </View>
                </View>
              </View>
            ))}
            {/* The body without the sleeves: its band down to the armpits, everything below
                (overlapping by a pixel, so no seam line shows). */}
            {b.cutY > b.y0 && (
              <View style={{ position: 'absolute', left: b.x0 * u, top: b.y0 * u, width: (b.x1 - b.x0) * u, height: (b.cutY - b.y0) * u + 1, overflow: 'hidden' }}>
                {picture(-b.x0 * u, -b.y0 * u)}
              </View>
            )}
            {b.cutY < g.box.h && (
              <View style={{ position: 'absolute', left: 0, top: Math.max(b.cutY, b.y0) * u, width: w, height: h - Math.max(b.cutY, b.y0) * u, overflow: 'hidden' }}>
                {picture(0, -Math.max(b.cutY, b.y0) * u)}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

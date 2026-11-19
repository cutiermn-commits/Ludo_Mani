import { useId, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { radius, space } from '@/ui/theme';
import { useTheme } from '@/ui/useTheme';

/**
 * Her morning routine, drawn (owner, 2026-11-19): she looks in the mirror (the try-on picture)
 * and picks from her wardrobe rail below it. Decorative only; all shapes are original.
 */
export function Mirror({ width, children }: { width: number; children: ReactNode }) {
  const c = useTheme();
  const id = `m${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const frame = 10;
  return (
    <View style={{ width, alignItems: 'center' }}>
      <View
        style={[
          st.frame,
          {
            width,
            borderTopLeftRadius: width / 2,
            borderTopRightRadius: width / 2,
            padding: frame,
            backgroundColor: c.primary,
            boxShadow: `0 10px 24px ${c.dark ? 'rgba(0,0,0,0.45)' : 'rgba(60, 30, 90, 0.18)'}`,
          },
        ]}>
        <View style={{ borderTopLeftRadius: width / 2, borderTopRightRadius: width / 2, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md, overflow: 'hidden', paddingTop: width * 0.16, paddingBottom: space.md, alignItems: 'center' }}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Defs>
              <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={c.dark ? '#2E3A4F' : '#EAF5FF'} />
                <Stop offset="0.55" stopColor={c.dark ? '#22293A' : '#FFFFFF'} />
                <Stop offset="1" stopColor={c.dark ? '#2B2440' : '#F2ECFF'} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
            {/* glass shine */}
            <Path d="M8,30 L22,12 L28,12 L14,30 Z" fill="#FFFFFF" opacity={c.dark ? 0.08 : 0.7} />
            <Path d="M17,36 L30,19 L32,19 L19,36 Z" fill="#FFFFFF" opacity={c.dark ? 0.06 : 0.6} />
            {/* floor / rug */}
            <Rect x="12" y="90" width="76" height="12" rx="6" fill={c.primarySoft} opacity={0.6} />
          </Svg>
          {children}
        </View>
      </View>
      <View style={[st.foot, { backgroundColor: c.primary }]} />
    </View>
  );
}

/** The wardrobe rail: a pole with her clothes hanging from it, scrolled sideways. */
export function Rail({ children }: { children: ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ gap: 0 }}>
      <View style={[st.pole, { backgroundColor: c.border }]} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.md, paddingHorizontal: space.sm, alignItems: 'flex-start' }}>
        {children}
      </ScrollView>
    </View>
  );
}

/** A hanger hook above a tile. */
export function Hanger({ width }: { width: number }) {
  const c = useTheme();
  return (
    <Svg width={width} height={22} viewBox="0 0 80 22" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ marginTop: -6 }}>
      <Path d="M40,1 C46,1 46,8 40,10 L12,21 L68,21 L40,10" stroke={c.textMuted} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const st = StyleSheet.create({
  frame: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  foot: { width: 70, height: 10, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, opacity: 0.85 },
  pole: { height: 6, borderRadius: 3, marginHorizontal: space.xs },
});

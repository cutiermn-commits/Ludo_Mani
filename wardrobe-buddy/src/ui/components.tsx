import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { tapFeedback } from './haptics';
import { radius, space, TAP } from './theme';
import { useTheme } from './useTheme';

type Variant = 'title' | 'heading' | 'body' | 'small' | 'label';

export function T({ children, variant = 'body', muted, style, center }: { children: ReactNode; variant?: Variant; muted?: boolean; style?: StyleProp<TextStyle>; center?: boolean }) {
  const c = useTheme();
  return (
    <Text
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : undefined}
      style={[styles[variant], { color: muted ? c.textMuted : c.text }, center && { textAlign: 'center' }, style]}>
      {children}
    </Text>
  );
}

/** Soft, playful bubbles behind every screen (decorative). */
function Backdrop() {
  const c = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width="100%" height="100%">
        <Circle cx="92%" cy="40" r="120" fill={c.primarySoft} opacity={c.dark ? 0.35 : 0.55} />
        <Circle cx="2%" cy="300" r="70" fill={c.surfaceAlt} opacity={0.8} />
        <Circle cx="85%" cy="620" r="46" fill={c.primarySoft} opacity={c.dark ? 0.25 : 0.4} />
        <Circle cx="12%" cy="900" r="90" fill={c.primarySoft} opacity={c.dark ? 0.2 : 0.35} />
      </Svg>
    </View>
  );
}

export function Screen({ children, scroll = true, padTop = false }: { children: ReactNode; scroll?: boolean; padTop?: boolean }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: padTop ? insets.top + space.lg : space.lg, paddingBottom: insets.bottom + space.xxl };
  if (!scroll)
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Backdrop />
        <View style={[styles.screen, pad]}>{children}</View>
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Backdrop />
      <ScrollView style={{ backgroundColor: 'transparent' }} contentContainerStyle={[styles.screen, pad]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function Card({ children, style, alt }: { children: ReactNode; style?: StyleProp<ViewStyle>; alt?: boolean }) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: alt ? c.surfaceAlt : c.surface, boxShadow: alt ? undefined : `0 6px 18px ${c.dark ? 'rgba(0,0,0,0.4)' : 'rgba(60, 30, 90, 0.10)'}` }, style]}>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  icon,
  hint,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  icon?: string;
  hint?: string;
}) {
  const c = useTheme();
  const bg = kind === 'primary' ? c.primary : c.surface;
  const fg = kind === 'primary' ? c.onPrimary : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        if (kind === 'primary') tapFeedback('confirm');
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: kind === 'danger' ? '#B3261E' : kind === 'primary' ? c.primary : c.border },
        kind === 'primary' && !disabled && { boxShadow: `0 6px 14px ${c.dark ? 'rgba(0,0,0,0.45)' : 'rgba(60, 30, 90, 0.25)'}` },
        pressed && { transform: [{ scale: 0.97 }] },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.9 },
      ]}>
      <Text style={[styles.buttonText, { color: kind === 'danger' && !c.dark ? '#B3261E' : fg }]}>
        {icon ? `${icon}  ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon, a11yLabel }: { label: string; selected?: boolean; onPress?: () => void; icon?: string; a11yLabel?: string }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      onPress={
        onPress
          ? () => {
              tapFeedback();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? c.primarySoft : c.surface, borderColor: selected ? c.primary : c.border },
        selected && { boxShadow: `0 3px 8px ${c.dark ? 'rgba(0,0,0,0.4)' : 'rgba(60, 30, 90, 0.15)'}` },
        pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
      ]}>
      <Text style={[styles.chipText, { color: selected ? c.onPrimarySoft : c.text }]}>
        {icon ? `${icon} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function Row({ children, wrap, gap = space.sm, style }: { children: ReactNode; wrap?: boolean; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">{title}</T>
        {right}
      </Row>
      {children}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { paddingHorizontal: space.lg, gap: space.lg, width: '100%', maxWidth: 720, alignSelf: 'center', flexGrow: 1 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.4 },
  heading: { fontSize: 20, fontWeight: '800' },
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 19 },
  label: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  button: {
    minHeight: TAP + 8,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  buttonText: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  chip: { minHeight: TAP, borderRadius: radius.pill, paddingHorizontal: space.lg, justifyContent: 'center', borderWidth: 1.5 },
  chipText: { fontSize: 15, fontWeight: '700' },
});

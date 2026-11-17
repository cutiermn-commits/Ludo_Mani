import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export function Screen({ children, scroll = true, padTop = false }: { children: ReactNode; scroll?: boolean; padTop?: boolean }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: padTop ? insets.top + space.lg : space.lg, paddingBottom: insets.bottom + space.xxl };
  if (!scroll) return <View style={[styles.screen, pad, { backgroundColor: c.background }]}>{children}</View>;
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[styles.screen, pad]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, alt }: { children: ReactNode; style?: StyleProp<ViewStyle>; alt?: boolean }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: alt ? c.surfaceAlt : c.surface, borderColor: c.border }, style]}>{children}</View>;
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
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: kind === 'danger' ? '#B3261E' : kind === 'primary' ? c.primary : c.border },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.8 },
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
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? c.primarySoft : c.surface, borderColor: selected ? c.primary : c.border },
        pressed && { opacity: 0.8 },
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
  title: { fontSize: 28, fontWeight: '800' },
  heading: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 19 },
  label: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: radius.md, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, gap: space.sm },
  button: {
    minHeight: TAP + 4,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  buttonText: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  chip: { minHeight: TAP, borderRadius: radius.pill, paddingHorizontal: space.lg, justifyContent: 'center', borderWidth: 1.5 },
  chipText: { fontSize: 15, fontWeight: '600' },
});

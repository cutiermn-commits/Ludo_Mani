import { Pressable, View } from 'react-native';

import { COLORS, type AvatarLook, type ColorName, type Locale, type StylePref, type ThemeName } from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import { Swatch } from '@/features/wardrobe/visuals';
import type { TKey } from '@/i18n';
import { Chip, Row, T } from '@/ui/components';
import { PALETTES, space, THEME_NAMES } from '@/ui/theme';
import { useTheme } from '@/ui/useTheme';

import { Avatar, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from './Avatar';

export function LanguagePicker({ value, onChange }: { value: Locale; onChange: (l: Locale) => void }) {
  const { t } = useApp();
  return (
    <Row wrap>
      {/* Language names are always shown in their own language. */}
      <Chip label={t('lang.da')} selected={value === 'da'} onPress={() => onChange('da')} icon="🇩🇰" />
      <Chip label={t('lang.en')} selected={value === 'en'} onPress={() => onChange('en')} icon="🇬🇧" />
    </Row>
  );
}

export function StylePrefPicker({ value, onChange }: { value: StylePref; onChange: (s: StylePref) => void }) {
  const { t } = useApp();
  const opts: { v: StylePref; icon: string }[] = [
    { v: 'dresses', icon: '👗' },
    { v: 'trousers', icon: '👖' },
    { v: 'mix', icon: '✨' },
  ];
  return (
    <View style={{ gap: space.sm }}>
      {opts.map((o) => (
        <Chip key={o.v} icon={o.icon} label={t(`stylePref.${o.v}` as TKey)} selected={value === o.v} onPress={() => onChange(o.v)} />
      ))}
    </View>
  );
}

export function AvatarMaker({ value, onChange }: { value: AvatarLook; onChange: (a: AvatarLook) => void }) {
  const { t } = useApp();
  const c = useTheme();
  const dot = (hex: string, selected: boolean, label: string, onPress: () => void) => (
    <Pressable
      key={hex + label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: hex, borderWidth: selected ? 4 : 1.5, borderColor: selected ? c.primary : c.border }}
    />
  );
  return (
    <View style={{ gap: space.md, alignItems: 'center' }}>
      <Avatar look={value} size={170} label={t('avatar.preview')} />
      <T variant="label">{t('avatar.skin')}</T>
      <Row wrap style={{ justifyContent: 'center' }}>
        {SKIN_TONES.map((h, i) => dot(h, value.skin === i, t('avatar.skinN', { n: i + 1 }), () => onChange({ ...value, skin: i })))}
      </Row>
      <T variant="label">{t('avatar.hair')}</T>
      <Row wrap style={{ justifyContent: 'center' }}>
        {HAIR_COLORS.map((h, i) => dot(h, value.hair === i, t('avatar.hairN', { n: i + 1 }), () => onChange({ ...value, hair: i })))}
      </Row>
      <Row wrap style={{ justifyContent: 'center' }}>
        {HAIR_STYLES.map((s) => (
          <Chip key={s} label={t(`avatar.style.${s}` as TKey)} selected={value.hairStyle === s} onPress={() => onChange({ ...value, hairStyle: s })} />
        ))}
      </Row>
    </View>
  );
}

export function ThemePicker({ value, onChange }: { value: ThemeName; onChange: (t: ThemeName) => void }) {
  const { t } = useApp();
  const c = useTheme();
  return (
    <Row wrap>
      {THEME_NAMES.map((name) => (
        <Pressable
          key={name}
          accessibilityRole="button"
          accessibilityLabel={t(`theme.${name}` as TKey)}
          accessibilityState={{ selected: value === name }}
          onPress={() => onChange(name)}
          style={{ alignItems: 'center', gap: 4, minWidth: 64 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: PALETTES[name].light.primary,
              borderWidth: value === name ? 4 : 1.5,
              borderColor: value === name ? c.text : c.border,
            }}
          />
          <T variant="small">{t(`theme.${name}` as TKey)}</T>
        </Pressable>
      ))}
    </Row>
  );
}

export function ColorPicker({ value, onChange, labelKey }: { value: ColorName[]; onChange: (c: ColorName[]) => void; labelKey: TKey }) {
  const { t } = useApp();
  return (
    <Row wrap>
      {COLORS.map((col) => {
        const selected = value.includes(col);
        return (
          <Pressable
            key={col}
            accessibilityRole="checkbox"
            accessibilityLabel={t(labelKey, { color: t(`color.${col}` as TKey) })}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(selected ? value.filter((x) => x !== col) : [...value, col])}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Swatch color={col} size={34} selected={selected} />
          </Pressable>
        );
      })}
    </Row>
  );
}

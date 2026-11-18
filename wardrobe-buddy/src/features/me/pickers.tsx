import { Pressable, View } from 'react-native';

import { AVATAR_HEIGHTS, HAIR_ACCESSORIES, type AvatarBuild, type AvatarLook, type Locale, type ThemeName } from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import type { TKey } from '@/i18n';
import { Chip, Row, T } from '@/ui/components';
import { PALETTES, space, THEME_NAMES } from '@/ui/theme';
import { useTheme } from '@/ui/useTheme';

import { Avatar, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from './Avatar';

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

export function AvatarMaker({ value, onChange }: { value: AvatarLook; onChange: (a: AvatarLook) => void }) {
  const { t } = useApp();
  const c = useTheme();
  const set = (p: Partial<AvatarLook>) => onChange({ ...value, ...p });
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
  /** Drawn choices for height and build: she picks a picture, never a number (D-062). */
  const shape = (look: AvatarLook, selected: boolean, label: string, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ alignItems: 'center', justifyContent: 'flex-end', padding: 4, borderRadius: 16, borderWidth: selected ? 3 : 1.5, borderColor: selected ? c.primary : c.border, backgroundColor: c.surface }}>
      <Avatar look={look} size={96} label="" />
    </Pressable>
  );
  const toggle = (key: 'glasses' | 'freckles' | 'earrings', icon: string) => (
    <Chip key={key} icon={icon} label={t(`avatar.${key}` as TKey)} selected={!!value[key]} onPress={() => set({ [key]: !value[key] })} />
  );
  return (
    <View style={{ gap: space.md, alignItems: 'center' }}>
      <Avatar look={value} size={240} label={t('avatar.preview')} />
      <T variant="label">{t('avatar.skin')}</T>
      <Row wrap style={{ justifyContent: 'center' }}>
        {SKIN_TONES.map((h, i) => dot(h, value.skin === i, t('avatar.skinN', { n: i + 1 }), () => set({ skin: i })))}
      </Row>
      <T variant="label">{t('avatar.hair')}</T>
      <Row wrap style={{ justifyContent: 'center' }}>
        {HAIR_COLORS.map((h, i) => dot(h, value.hair === i, t('avatar.hairN', { n: i + 1 }), () => set({ hair: i })))}
      </Row>
      <Row wrap style={{ justifyContent: 'center' }}>
        {HAIR_STYLES.map((s) => (
          <Chip key={s} label={t(`avatar.style.${s}` as TKey)} selected={value.hairStyle === s} onPress={() => set({ hairStyle: s })} />
        ))}
      </Row>
      <T variant="label">{t('avatar.eyes')}</T>
      <Row wrap style={{ justifyContent: 'center' }}>
        {EYE_COLORS.map((h, i) => dot(h, (value.eyes ?? 1) === i, t('avatar.eyesN', { n: i + 1 }), () => set({ eyes: i })))}
      </Row>
      <T variant="label">{t('avatar.height')}</T>
      <Row wrap style={{ justifyContent: 'center', alignItems: 'flex-end' }}>
        {AVATAR_HEIGHTS.map((h) => shape({ ...value, height: h }, (value.height ?? 'medium') === h, t(`avatar.height.${h}` as TKey), () => set({ height: h })))}
      </Row>
      <T variant="label">{t('avatar.build')}</T>
      <Row wrap style={{ justifyContent: 'center', alignItems: 'flex-end' }}>
        {([1, 2, 3] as AvatarBuild[]).map((b) => shape({ ...value, build: b }, (value.build ?? 2) === b, t('avatar.buildN', { n: b }), () => set({ build: b })))}
      </Row>
      <T variant="label">{t('avatar.extras')}</T>
      <Row wrap style={{ justifyContent: 'center' }}>
        {toggle('glasses', '👓')}
        {toggle('freckles', '✨')}
        {toggle('earrings', '💛')}
      </Row>
      <Row wrap style={{ justifyContent: 'center' }}>
        {HAIR_ACCESSORIES.map((a) => (
          <Chip key={a} label={t(`avatar.acc.${a}` as TKey)} selected={(value.accessory ?? 'none') === a} onPress={() => set({ accessory: a })} />
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

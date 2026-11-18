import { useState } from 'react';
import { View } from 'react-native';

import type { ThemeMode } from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import { BodyPhotoCard } from '@/features/fit/BodyPhotoCard';
import { Avatar } from '@/features/me/Avatar';
import { AvatarMaker, LanguagePicker, ThemePicker } from '@/features/me/pickers';
import type { TKey } from '@/i18n';
import { Button, Card, Chip, Row, Screen, Section, T } from '@/ui/components';
import { space } from '@/ui/theme';

/** Step 1 of the simple flow (D-061): "Configure myself" — avatar, own photo, language and colours. */
export default function Me() {
  const { t, profile, updateProfile, setLocale, locale } = useApp();
  const [editAvatar, setEditAvatar] = useState(false);
  if (!profile) return null;

  return (
    <Screen>
      <T variant="title">{profile.nickname}</T>

      <Section title={t('me.showAs')}>
        <Row wrap>
          <Chip icon="🧍" label={t('today.showAvatar')} selected={!profile.useSelfie} onPress={() => updateProfile({ useSelfie: false })} />
          <Chip icon="📸" label={t('today.showPhoto')} selected={!!profile.useSelfie} onPress={() => updateProfile({ useSelfie: !!profile.selfieUri })} />
        </Row>
      </Section>

      <Section title={t('me.myAvatar')}>
        <Card style={{ alignItems: 'center' }}>
          {editAvatar ? <AvatarMaker value={profile.avatar} onChange={(avatar) => updateProfile({ avatar })} /> : <Avatar look={profile.avatar} size={240} label={t('avatar.preview')} />}
          <Button kind={editAvatar ? 'primary' : 'secondary'} label={editAvatar ? t('common.done') : t('me.editAvatar')} onPress={() => setEditAvatar(!editAvatar)} />
        </Card>
      </Section>

      <Section title={t('me.myPhoto')}>
        <BodyPhotoCard />
      </Section>

      <Section title={t('me.language')}>
        <LanguagePicker value={locale} onChange={setLocale} />
      </Section>

      <Section title={t('me.theme')}>
        <ThemePicker value={profile.theme} onChange={(theme) => updateProfile({ theme })} />
        <Row wrap>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
            <Chip key={m} label={t(`themeMode.${m}` as TKey)} selected={profile.themeMode === m} onPress={() => updateProfile({ themeMode: m })} />
          ))}
        </Row>
      </Section>
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

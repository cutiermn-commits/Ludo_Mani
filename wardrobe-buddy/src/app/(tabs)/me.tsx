import { useState } from 'react';
import { View } from 'react-native';

import type { StyleTag, ThemeMode } from '@/domain/types';
import { summarizeLearning } from '@/engine';
import { useApp } from '@/features/app/AppState';
import { Avatar } from '@/features/me/Avatar';
import { DiaryList } from '@/features/me/DiaryPhotoCard';
import { SelfieCard } from '@/features/me/SelfieCard';
import { AvatarMaker, ColorPicker, LanguagePicker, StylePrefPicker, ThemePicker } from '@/features/me/pickers';
import { useItemName } from '@/features/wardrobe/visuals';
import type { TKey } from '@/i18n';
import { Button, Card, Chip, Row, Screen, Section, T } from '@/ui/components';
import { space } from '@/ui/theme';

/** Her own space: look, theme, language, likes, and what the app has learned. Nothing here needs the parental gate. */
export default function Me() {
  const { t, profile, updateProfile, setLocale, locale, learning, items } = useApp();
  const nameOf = useItemName();
  const [editAvatar, setEditAvatar] = useState(false);
  if (!profile) return null;

  const learned = summarizeLearning(learning);
  const likedNames = learned.likedItemIds.map((id) => items.find((i) => i.id === id)).filter((i) => !!i).map((i) => nameOf(i!));
  const learnedLines: string[] = [];
  if (likedNames.length) learnedLines.push(t('me.learnedItems', { items: likedNames.join(t('me.and')) }));
  if (learned.likedTags.length) learnedLines.push(t('me.learnedTags', { tags: learned.likedTags.map((x: StyleTag) => t(`tag.${x}` as TKey).toLocaleLowerCase(locale)).join(t('me.and')) }));
  if (learned.runsCold) learnedLines.push(t('me.learnedCold'));
  if (learned.runsWarm) learnedLines.push(t('me.learnedWarm'));

  return (
    <Screen>
      <Card style={{ alignItems: 'center' }}>
        <Row wrap style={{ justifyContent: 'center' }}>
          <Chip icon="🧍" label={t('selfie.useAvatar')} selected={!profile.useSelfie} onPress={() => updateProfile({ useSelfie: false })} />
          <Chip icon="📸" label={t('selfie.usePhoto')} selected={!!profile.useSelfie} onPress={() => updateProfile({ useSelfie: true })} />
        </Row>
        {profile.useSelfie ? (
          <SelfieCard value={profile.selfieUri} onChange={(selfieUri) => updateProfile({ selfieUri, useSelfie: !!selfieUri })} />
        ) : editAvatar ? (
          <AvatarMaker value={profile.avatar} onChange={(avatar) => updateProfile({ avatar })} />
        ) : (
          <Avatar look={profile.avatar} size={170} label={t('avatar.preview')} />
        )}
        <T variant="title">{profile.nickname}</T>
        {!profile.useSelfie && <Button kind="secondary" label={editAvatar ? t('common.done') : t('me.editAvatar')} onPress={() => setEditAvatar(!editAvatar)} />}
      </Card>

      <Section title={t('diary.title')}>
        <DiaryList />
      </Section>

      <Section title={t('me.learnedTitle')}>
        <Card alt>
          {learned.hasLearned ? learnedLines.map((l) => <T key={l}>{l}</T>) : <T>{t('me.learnedNothing')}</T>}
        </Card>
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

      <Section title={t('me.appStyle')}>
        <Row wrap>
          <Chip icon="🎈" label={t('uiStyle.playful')} selected={profile.uiStyle === 'playful'} onPress={() => updateProfile({ uiStyle: 'playful' })} />
          <Chip icon="▫️" label={t('uiStyle.clean')} selected={profile.uiStyle === 'clean'} onPress={() => updateProfile({ uiStyle: 'clean' })} />
        </Row>
      </Section>

      <Section title={t('me.myStyle')}>
        <StylePrefPicker value={profile.stylePref} onChange={(stylePref) => updateProfile({ stylePref })} />
      </Section>

      <Section title={t('me.temperature')}>
        <Row wrap>
          <Chip icon="🥶" label={t('me.runCold')} selected={profile.tempOffsetC < 0} onPress={() => updateProfile({ tempOffsetC: -2 })} />
          <Chip icon="🙂" label={t('me.runNormal')} selected={profile.tempOffsetC === 0} onPress={() => updateProfile({ tempOffsetC: 0 })} />
          <Chip icon="🥵" label={t('me.runWarm')} selected={profile.tempOffsetC > 0} onPress={() => updateProfile({ tempOffsetC: 2 })} />
        </Row>
      </Section>

      <Section title={t('me.likedColors')}>
        <ColorPicker value={profile.likedColors} onChange={(likedColors) => updateProfile({ likedColors, dislikedColors: profile.dislikedColors.filter((x) => !likedColors.includes(x)) })} labelKey="me.likeColorA11y" />
      </Section>
      <Section title={t('me.dislikedColors')}>
        <ColorPicker value={profile.dislikedColors} onChange={(dislikedColors) => updateProfile({ dislikedColors, likedColors: profile.likedColors.filter((x) => !dislikedColors.includes(x)) })} labelKey="me.dislikeColorA11y" />
      </Section>
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

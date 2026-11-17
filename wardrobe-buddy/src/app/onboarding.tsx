import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import type { AgeBand, AvatarLook, City, Locale, Profile, StylePref } from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import { newId } from '@/features/app/dates';
import { DEFAULT_AVATAR } from '@/features/me/Avatar';
import { AvatarMaker, LanguagePicker, StylePrefPicker } from '@/features/me/pickers';
import { SelfieCard } from '@/features/me/SelfieCard';
import { ParentalGate } from '@/features/parent/ParentalGate';
import { CitySearch } from '@/features/weather/CitySearch';
import { Button, Card, Chip, Row, Screen, T } from '@/ui/components';
import { radius, space, TAP } from '@/ui/theme';
import { useTheme } from '@/ui/useTheme';

const STEPS = ['language', 'parent', 'nickname', 'style', 'avatar', 'city'] as const;
type Step = (typeof STEPS)[number];

/** Parent-led setup (PRIVACY_SAFETY §1: one flow for all ages 11–15). ≤ 6 steps, skippable after step 3. */
export default function Onboarding() {
  const { t, locale, setLocale, saveProfile, profile: existing } = useApp();
  const c = useTheme();
  const [step, setStep] = useState<Step>('language');
  const [nickname, setNickname] = useState('');
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);
  const [stylePref, setStylePref] = useState<StylePref>('mix');
  const [avatar, setAvatar] = useState<AvatarLook>(DEFAULT_AVATAR);
  const [city, setCity] = useState<City | undefined>();
  const [gatePassed, setGatePassed] = useState(false);
  const [selfieUri, setSelfieUri] = useState<string | undefined>();
  const [consent, setConsent] = useState<boolean | null>(null);

  const index = STEPS.indexOf(step);
  const next = () => setStep(STEPS[index + 1]);
  const back = () => setStep(STEPS[index - 1]);

  const finish = async () => {
    const band = ageBand ?? '11-12';
    const profile: Profile = {
      id: newId(),
      nickname: nickname.trim(),
      ageBand: band,
      uiStyle: band === '11-12' ? 'playful' : 'clean',
      stylePref,
      likedColors: [],
      dislikedColors: [],
      tempOffsetC: 0,
      theme: 'purple',
      themeMode: 'system',
      locale,
      avatar,
      city: consent ? city : undefined,
      weatherConsent: consent === true,
      selfieUri,
      useSelfie: !!selfieUri,
    };
    await saveProfile(profile);
    router.replace('/wardrobe');
  };

  const canSkip = index >= 3;
  // Set-up runs once. With a profile, re-running it would overwrite her data (delete-all is in the parent area).
  if (existing) return <Redirect href="/wardrobe" />;

  return (
    <Screen padTop>
      <View accessibilityRole="progressbar" accessibilityLabel={t('onboarding.progress', { n: index + 1, total: STEPS.length })} accessibilityValue={{ min: 1, max: STEPS.length, now: index + 1 }}>
        <Row gap={6}>
          {STEPS.map((s, i) => (
            <View key={s} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= index ? c.primary : c.surfaceAlt }} />
          ))}
        </Row>
      </View>

      {step === 'language' && (
        <Card>
          <T variant="title">{t('onboarding.hello')}</T>
          <T>{t('onboarding.language')}</T>
          <LanguagePicker value={locale} onChange={(l: Locale) => setLocale(l)} />
          <Button label={t('common.next')} onPress={next} />
        </Card>
      )}

      {step === 'parent' && (
        <>
          <Card>
            <T variant="heading">{t('onboarding.parentTitle')}</T>
            <T>{t('onboarding.parentBody1')}</T>
            <T>{t('onboarding.parentBody2')}</T>
            <T>{t('onboarding.parentBody3')}</T>
          </Card>
          {!gatePassed ? (
            <ParentalGate onPass={() => setGatePassed(true)} />
          ) : (
            <Card>
              <T variant="heading">{t('consent.title')}</T>
              <T>{t('consent.body')}</T>
              <Chip icon="🌦️" label={t('consent.yes')} selected={consent === true} onPress={() => setConsent(true)} />
              <Chip icon="✋" label={t('consent.no')} selected={consent === false} onPress={() => setConsent(false)} />
              <Button label={t('common.next')} onPress={next} disabled={consent === null} />
            </Card>
          )}
          <Button kind="secondary" label={t('common.back')} onPress={back} />
        </>
      )}

      {step === 'nickname' && (
        <Card>
          <T variant="heading">{t('onboarding.nicknameTitle')}</T>
          <T muted>{t('onboarding.nicknameHint')}</T>
          <TextInput
            accessibilityLabel={t('onboarding.nicknameLabel')}
            value={nickname}
            onChangeText={(v) => setNickname(v.slice(0, 20))}
            placeholder={t('onboarding.nicknamePlaceholder')}
            placeholderTextColor={c.textMuted}
            autoComplete="off"
            autoCorrect={false}
            textContentType="none"
            maxLength={20}
            style={{ minHeight: TAP + 4, borderRadius: radius.sm, borderWidth: 1.5, borderColor: c.border, color: c.text, backgroundColor: c.surface, fontSize: 18, paddingHorizontal: space.lg }}
          />
          <T variant="label">{t('onboarding.ageTitle')}</T>
          <Row wrap>
            <Chip label={t('age.11-12')} selected={ageBand === '11-12'} onPress={() => setAgeBand('11-12')} />
            <Chip label={t('age.13-15')} selected={ageBand === '13-15'} onPress={() => setAgeBand('13-15')} />
          </Row>
          <Button label={t('common.next')} onPress={next} disabled={nickname.trim() === '' || !ageBand} />
        </Card>
      )}

      {step === 'style' && (
        <Card>
          <T variant="heading">{t('onboarding.styleTitle')}</T>
          <T muted>{t('onboarding.styleHint')}</T>
          <StylePrefPicker value={stylePref} onChange={setStylePref} />
          <Button label={t('common.next')} onPress={next} />
        </Card>
      )}

      {step === 'avatar' && (
        <Card>
          <T variant="heading">{t('onboarding.avatarTitle')}</T>
          <AvatarMaker value={avatar} onChange={setAvatar} />
          <SelfieCard value={selfieUri} onChange={setSelfieUri} />
          <Button label={t('common.next')} onPress={next} />
        </Card>
      )}

      {step === 'city' && (
        <Card>
          <T variant="heading">{t('onboarding.cityTitle')}</T>
          {consent ? (
            <>
              <T muted>{t('onboarding.cityHint')}</T>
              <CitySearch value={city} onPick={setCity} consented />
            </>
          ) : (
            <T>{t('onboarding.noWeather')}</T>
          )}
          <Button label={t('onboarding.finish')} onPress={finish} />
        </Card>
      )}

      {canSkip && step !== 'city' && <Button kind="secondary" label={t('onboarding.skip')} onPress={finish} hint={t('onboarding.skipHint')} />}
      {index >= 2 && <Button kind="secondary" label={t('common.back')} onPress={back} />}
    </Screen>
  );
}

import { router } from 'expo-router';
import { useState } from 'react';
import { Switch } from 'react-native';

import { useApp } from '@/features/app/AppState';
import { todayISO } from '@/features/app/dates';
import { ParentalGate } from '@/features/parent/ParentalGate';
import { CitySearch } from '@/features/weather/CitySearch';
import { shareExport } from '@/services/export/share';
import { Button, Card, Row, Screen, Section, T } from '@/ui/components';

/** Parent area. Everything here sits behind the gate (PRIVACY_SAFETY §2.5); the gate resets every visit. */
export default function Parent() {
  const { t, profile, updateProfile, resetLearning, deleteEverything, exportJson } = useApp();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (!open) {
    return (
      <Screen>
        <ParentalGate onPass={() => setOpen(true)} />
      </Screen>
    );
  }

  const doExport = async () => {
    const json = await exportJson();
    const ok = await shareExport(json, `wardrobe-buddy-${todayISO()}.json`, t('parent.export'));
    if (!ok) setDone(t('parent.exportUnavailable'));
  };

  return (
    <Screen>
      <T variant="title">{t('parent.title')}</T>
      {done && (
        <Card alt>
          <T>{done}</T>
        </Card>
      )}

      <Section title={t('consent.title')}>
        <Card>
          <T>{t('consent.body')}</T>
          <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
            <T>{t('consent.switch')}</T>
            <Switch accessibilityLabel={t('consent.switch')} value={!!profile?.weatherConsent} onValueChange={(v) => updateProfile({ weatherConsent: v })} />
          </Row>
        </Card>
      </Section>

      {profile?.weatherConsent && (
        <Section title={t('parent.city')}>
          <CitySearch value={profile.city} onPick={(city) => updateProfile({ city })} consented />
        </Section>
      )}

      <Section title={t('parent.data')}>
        <Card>
          <T>{t('parent.dataBody')}</T>
          <Button kind="secondary" label={t('parent.export')} onPress={doExport} />
          <T variant="small" muted>
            {t('parent.exportNote')}
          </T>
          <Button
            kind="secondary"
            label={t('parent.resetLearning')}
            onPress={async () => {
              await resetLearning();
              setDone(t('parent.learningReset'));
            }}
          />
          {!confirmDelete ? (
            <Button kind="danger" label={t('parent.deleteAll')} onPress={() => setConfirmDelete(true)} />
          ) : (
            <>
              <T>{t('parent.deleteConfirm')}</T>
              <Button
                kind="danger"
                label={t('parent.deleteYes')}
                onPress={async () => {
                  await deleteEverything();
                  router.replace('/onboarding');
                }}
              />
              <Button kind="secondary" label={t('common.cancel')} onPress={() => setConfirmDelete(false)} />
            </>
          )}
        </Card>
      </Section>

      <Section title={t('parent.about')}>
        <Card>
          <T>{t('parent.aboutBody')}</T>
          <T>{t('parent.privacyBody')}</T>
          <T variant="small" muted>
            {t('parent.attribution')}
          </T>
        </Card>
      </Section>
    </Screen>
  );
}

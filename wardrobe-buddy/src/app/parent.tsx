import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, Switch } from 'react-native';

import { useApp } from '@/features/app/AppState';
import { ParentalGate } from '@/features/parent/ParentalGate';
import { CitySearch } from '@/features/weather/CitySearch';
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
    if (Platform.OS === 'web') {
      // Web: download a file locally; nothing is uploaded.
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'wardrobe-buddy-export.json';
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      // Native: the OS share sheet, opened only by the parent behind the gate.
      await Share.share({ message: json, title: 'wardrobe-buddy-export.json' });
    }
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

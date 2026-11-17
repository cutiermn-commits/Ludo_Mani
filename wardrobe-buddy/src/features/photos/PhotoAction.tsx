import { useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { useApp } from '@/features/app/AppState';
import type { Picked, PickResult } from '@/services/photos/pipeline';
import { Button, Card, T } from '@/ui/components';
import { useTheme } from '@/ui/useTheme';

export type PhotoState = 'idle' | 'intro' | 'working' | 'denied' | 'deniedForever' | 'failed';

/**
 * Shared photo flow for clothes and selfies: a one-time explanation before the first camera
 * permission prompt (PRIVACY_SAFETY §2.4), then pick → process → done, with friendly errors.
 */
export function usePhotoAction() {
  const { profile, updateProfile } = useApp();
  const [state, setState] = useState<PhotoState>('idle');
  // Onboarding has no profile yet, so remember the explanation locally too.
  const [introSeenHere, setIntroSeenHere] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  async function run<T>(pick: () => Promise<PickResult>, process: (p: Picked) => Promise<T>, done: (result: T) => void | Promise<void>) {
    setState('working');
    try {
      const res = await pick();
      if (res.kind === 'denied') return setState(res.canAskAgain ? 'denied' : 'deniedForever');
      if (res.kind === 'canceled') return setState('idle');
      await done(await process(res));
      setState('idle');
    } catch {
      setState('failed');
    }
  }

  /** Runs `go` straight away if the camera was explained before, otherwise explains first. */
  function withCameraIntro(go: () => void) {
    if (profile?.cameraIntroSeen || introSeenHere) return go();
    pending.current = go;
    setState('intro');
  }

  async function confirmIntro() {
    setIntroSeenHere(true);
    if (profile) await updateProfile({ cameraIntroSeen: true });
    setState('idle');
    const go = pending.current;
    pending.current = null;
    go?.();
  }

  return { state, run, withCameraIntro, confirmIntro, cancelIntro: () => setState('idle') };
}

/** Intro card, spinner and messages for a `usePhotoAction` state. Renders nothing when idle. */
export function PhotoStatus({ action }: { action: ReturnType<typeof usePhotoAction> }) {
  const { t } = useApp();
  const c = useTheme();
  switch (action.state) {
    case 'intro':
      return (
        <Card alt>
          <T variant="heading">{t('photo.introTitle')}</T>
          <T>{t('photo.introBody')}</T>
          <Button icon="📷" label={t('photo.introOk')} onPress={() => void action.confirmIntro()} />
          <Button kind="secondary" label={t('common.cancel')} onPress={action.cancelIntro} />
        </Card>
      );
    case 'working':
      return <ActivityIndicator color={c.primary} accessibilityLabel={t('photo.working')} />;
    case 'denied':
      return <T muted>{t('photo.denied')}</T>;
    case 'deniedForever':
      return <T muted>{t('photo.deniedForever')}</T>;
    case 'failed':
      return <T muted>{t('photo.failed')}</T>;
    default:
      return null;
  }
}

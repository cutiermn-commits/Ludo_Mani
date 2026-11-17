import { useState } from 'react';
import { ActivityIndicator, Image, Platform, View } from 'react-native';

import { useApp } from '@/features/app/AppState';
import type { PickResult } from '@/services/photos/capture';
import { pickSelfie, processSelfie, takeSelfie } from '@/services/photos/selfie';
import { Card, Chip, Row, T } from '@/ui/components';
import { radius } from '@/ui/theme';
import { useTheme } from '@/ui/useTheme';

/** Selfie image, always stored blurred (D-033, D-045). */
export function SelfieImage({ uri, size, label }: { uri: string; size: number; label: string }) {
  return (
    <Image
      source={{ uri }}
      style={{ width: size * 0.75, height: size, borderRadius: radius.md }}
      resizeMode="cover"
      accessibilityLabel={label}
      accessibilityIgnoresInvertColors
    />
  );
}

/**
 * "Make your avatar or take a photo of yourself" (her sketch, page 2b).
 * Explains first, then asks for the camera; the stored photo always has the face area blurred.
 */
export function SelfieCard({ value, onChange }: { value?: string; onChange: (uri: string | undefined) => void }) {
  const { t, photos } = useApp();
  const c = useTheme();
  const [state, setState] = useState<'idle' | 'working' | 'denied' | 'deniedForever' | 'failed'>('idle');

  const run = async (pick: () => Promise<PickResult>) => {
    setState('working');
    try {
      const res = await pick();
      if (res.kind === 'denied') return setState(res.canAskAgain ? 'denied' : 'deniedForever');
      if (res.kind === 'canceled') return setState('idle');
      const uri = await processSelfie(res.uri, photos);
      if (value) await photos.remove(value);
      onChange(uri);
      setState('idle');
    } catch {
      setState('failed');
    }
  };

  return (
    <Card alt>
      <T variant="label">{t('selfie.title')}</T>
      {value ? (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <SelfieImage uri={value} size={200} label={t('selfie.a11y')} />
          <T variant="small" muted center>
            {t('selfie.blurred')}
          </T>
        </View>
      ) : (
        <T variant="small">{t('selfie.explain')}</T>
      )}
      {state === 'working' ? (
        <ActivityIndicator color={c.primary} accessibilityLabel={t('photo.working')} />
      ) : (
        <Row wrap>
          {Platform.OS !== 'web' && <Chip icon="🤳" label={t('selfie.take')} onPress={() => void run(takeSelfie)} />}
          <Chip icon="🖼️" label={t('photo.choose')} onPress={() => void run(pickSelfie)} />
          {value && (
            <Chip
              icon="✖️"
              label={t('photo.remove')}
              onPress={async () => {
                await photos.remove(value);
                onChange(undefined);
              }}
            />
          )}
        </Row>
      )}
      {state === 'denied' && <T muted>{t('photo.denied')}</T>}
      {state === 'deniedForever' && <T muted>{t('photo.deniedForever')}</T>}
      {state === 'failed' && <T muted>{t('photo.failed')}</T>}
    </Card>
  );
}

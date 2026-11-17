import { Image, Platform, View } from 'react-native';

import { useApp } from '@/features/app/AppState';
import { PhotoStatus, usePhotoAction } from '@/features/photos/PhotoAction';
import { pickSelfie, processSelfie } from '@/services/photos/selfie';
import { Card, Chip, Row, T } from '@/ui/components';
import { radius } from '@/ui/theme';

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
 * Explains first, then asks for the camera. The stored photo always has the face area blurred;
 * "Blur the whole photo" blurs everything when the face sits lower in the picture.
 */
export function SelfieCard({ value, onChange }: { value?: string; onChange: (uri: string | undefined) => void | Promise<void> }) {
  const { t, photos } = useApp();
  const action = usePhotoAction();

  // Save the new photo first, then delete the old one (never leave the profile pointing at nothing).
  const replace = async (uri: string | undefined) => {
    const old = value;
    await onChange(uri);
    if (old && old !== uri) await photos.remove(old);
  };

  const add = (source: 'camera' | 'library') =>
    action.run(() => pickSelfie(source), (p) => processSelfie(p, photos), replace);

  const blurAll = () =>
    value &&
    action.run(
      // Re-process the saved (already blurred) photo with the whole picture blurred.
      async () => ({ kind: 'ok' as const, uri: value, width: 0, height: 0 }),
      (p) => processSelfie(p, photos, { whole: true, deleteSource: false }),
      replace,
    );

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
      <T variant="small" muted>
        {t('selfie.onlyYou')}
      </T>
      <PhotoStatus action={action} />
      {action.state !== 'intro' && action.state !== 'working' && (
        <Row wrap>
          {Platform.OS !== 'web' && <Chip icon="🤳" label={t('selfie.take')} onPress={() => action.withCameraIntro(() => void add('camera'))} />}
          <Chip icon="🖼️" label={t('photo.choose')} onPress={() => void add('library')} />
          {value && <Chip icon="🌫️" label={t('selfie.blurAll')} onPress={() => void blurAll()} />}
          {value && <Chip icon="✖️" label={t('photo.remove')} onPress={() => void replace(undefined)} />}
        </Row>
      )}
    </Card>
  );
}

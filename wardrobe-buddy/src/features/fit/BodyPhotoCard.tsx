import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useApp } from '@/features/app/AppState';
import { PhotoStatus, usePhotoAction } from '@/features/photos/PhotoAction';
import { pickBodyPhoto, processBodyPhoto } from '@/services/photos/selfie';
import { detectPose } from '@/services/pose/detect';
import { useRunPose } from '@/services/pose/types';
import { Card, Chip, Row, T } from '@/ui/components';
import { useTheme } from '@/ui/useTheme';

import { MarkBody } from './MarkBody';
import { TryOnPhoto } from './TryOnPhoto';

type Found = 'idle' | 'finding' | 'found' | 'feetGuessed' | 'notFound' | 'manual';

/**
 * "My photo" (D-063, D-064): a full-body photo of herself to try clothes on. After saving, the
 * phone looks for her shoulders, hips and feet with the on-device model; if it can't, she taps
 * them herself. Everything stays on the device.
 */
export function BodyPhotoCard({ width = 220 }: { width?: number }) {
  const { t, profile, updateProfile, photos } = useApp();
  const runPose = useRunPose();
  const action = usePhotoAction();
  const c = useTheme();
  const [found, setFound] = useState<Found>('idle');
  const [marking, setMarking] = useState(false);
  if (!profile) return null;
  const uri = profile.selfieUri;

  const find = async (photo: { uri: string; width: number; height: number }) => {
    setFound('finding');
    try {
      const res = await detectPose(photo, photos, runPose);
      if (res.ok) {
        await updateProfile({ photoPose: res.pose, photoPoseSource: 'auto' });
        setFound(res.estimatedFeet ? 'feetGuessed' : 'found');
      } else {
        await updateProfile({ photoPose: undefined, photoPoseSource: undefined });
        setFound('notFound');
      }
    } catch {
      await updateProfile({ photoPose: undefined, photoPoseSource: undefined });
      setFound('notFound');
    }
  };

  const add = (source: 'camera' | 'library') =>
    action.run(
      () => pickBodyPhoto(source),
      (p) => processBodyPhoto(p, photos),
      async (res) => {
        const old = profile.selfieUri;
        // Save the new photo first, then delete the old one (never leave the profile pointing at nothing).
        await updateProfile({ selfieUri: res.uri, photoAspect: res.aspect, photoPose: undefined, photoPoseSource: undefined, useSelfie: true });
        if (old && old !== res.uri) await photos.remove(old);
        await find(res);
      },
    );

  const remove = async () => {
    const old = profile.selfieUri;
    await updateProfile({ selfieUri: undefined, photoAspect: undefined, photoPose: undefined, photoPoseSource: undefined, useSelfie: false });
    if (old) await photos.remove(old);
    setFound('idle');
  };

  const message: Record<Found, string | null> = {
    idle: null,
    finding: t('body.finding'),
    found: t('body.found'),
    feetGuessed: t('body.feetGuessed'),
    notFound: t('body.notFound'),
    manual: t('body.manualSaved'),
  };

  return (
    <Card alt>
      <T variant="label">{t('body.title')}</T>
      {!uri && <T variant="small">{t('body.explain')}</T>}
      {uri && marking ? (
        <MarkBody
          uri={uri}
          aspect={profile.photoAspect}
          width={width}
          onCancel={() => setMarking(false)}
          onDone={async (pose) => {
            await updateProfile({ photoPose: pose, photoPoseSource: 'manual' });
            setMarking(false);
            setFound('manual');
          }}
        />
      ) : (
        uri && (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <TryOnPhoto uri={uri} aspect={profile.photoAspect} pose={profile.photoPose} width={width} label={t('body.a11y')} showPoints />
            {found === 'finding' && <ActivityIndicator color={c.primary} accessibilityLabel={t('body.finding')} />}
            {message[found] && (
              <T variant="small" center>
                {message[found]}
              </T>
            )}
            {!profile.photoPose && found !== 'finding' && found !== 'notFound' && (
              <T variant="small" muted center>
                {t('body.noPoints')}
              </T>
            )}
          </View>
        )
      )}
      <T variant="small" muted>
        {t('body.onlyYou')}
      </T>
      <PhotoStatus action={action} />
      {action.state !== 'intro' && action.state !== 'working' && found !== 'finding' && !marking && (
        <Row wrap>
          <Chip icon="📷" label={t('body.take')} onPress={() => action.withCameraIntro(() => void add('camera'))} />
          <Chip icon="🖼️" label={t('photo.choose')} onPress={() => void add('library')} />
          {uri && <Chip icon="✨" label={t('body.findAgain')} onPress={() => void find({ uri, width: 0, height: 0 })} />}
          {uri && <Chip icon="👆" label={t('body.markMyself')} onPress={() => setMarking(true)} />}
          {uri && <Chip icon="✖️" label={t('photo.remove')} onPress={() => void remove()} />}
        </Row>
      )}
    </Card>
  );
}

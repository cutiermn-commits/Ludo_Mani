import { Image, View } from 'react-native';

import { useApp } from '@/features/app/AppState';
import { newId } from '@/features/app/dates';
import { PhotoStatus, usePhotoAction } from '@/features/photos/PhotoAction';
import { pickSelfie, processSelfie } from '@/services/photos/selfie';
import { Card, Chip, Row, T } from '@/ui/components';
import { radius } from '@/ui/theme';

/**
 * Optional "I wore this" photo for her diary (F10). Uses the selfie pipeline, so the face area
 * is always blurred and metadata stripped before saving (D-045). Learning uses the tagged
 * items, never the image.
 */
export function DiaryPhotoCard({ outfitId }: { outfitId: string }) {
  const { t, photos, diary, addDiaryPhoto, removeDiaryPhoto } = useApp();
  const action = usePhotoAction();
  const entry = diary.find((d) => d.outfitId === outfitId);

  const add = (source: 'camera' | 'library') =>
    action.run(
      () => pickSelfie(source),
      (p) => processSelfie(p, photos),
      (photoUri) => addDiaryPhoto({ id: newId(), outfitId, photoUri, faceBlurred: true }),
    );

  return (
    <Card alt>
      <T variant="label">{t('diary.addTitle')}</T>
      {entry ? (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Image source={{ uri: entry.photoUri }} style={{ width: 150, height: 200, borderRadius: radius.md }} resizeMode="cover" accessibilityLabel={t('diary.photoA11y')} accessibilityIgnoresInvertColors />
          <T variant="small" muted center>
            {t('selfie.blurred')}
          </T>
        </View>
      ) : (
        <T variant="small">{t('diary.explain')}</T>
      )}
      <PhotoStatus action={action} />
      {action.state !== 'intro' && action.state !== 'working' && (
        <Row wrap>
          <Chip icon="📸" label={t('photo.take')} onPress={() => action.withCameraIntro(() => void add('camera'))} />
          <Chip icon="🖼️" label={t('photo.choose')} onPress={() => void add('library')} />
          {entry && <Chip icon="✖️" label={t('photo.remove')} onPress={() => void removeDiaryPhoto(entry.id)} />}
        </Row>
      )}
    </Card>
  );
}

/** Her outfit diary in Me: newest first, photo (blurred) + date + stars. */
export function DiaryList() {
  const { t, locale, diary, outfits, ratings, removeDiaryPhoto } = useApp();
  const rows = diary
    .map((d) => ({ d, o: outfits.find((o) => o.id === d.outfitId), r: ratings.find((r) => r.outfitId === d.outfitId) }))
    .sort((a, b) => (b.o?.date ?? '').localeCompare(a.o?.date ?? ''));
  if (rows.length === 0) return <T muted>{t('diary.empty')}</T>;
  const fmt = new Intl.DateTimeFormat(locale === 'da' ? 'da-DK' : 'en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return (
    <Row wrap gap={12} style={{ alignItems: 'flex-start' }}>
      {rows.map(({ d, o, r }) => (
        <View key={d.id} style={{ width: 120, gap: 4 }}>
          <Image source={{ uri: d.photoUri }} style={{ width: 120, height: 160, borderRadius: radius.md }} resizeMode="cover" accessibilityLabel={t('diary.photoA11y')} accessibilityIgnoresInvertColors />
          {o && <T variant="small">{fmt.format(new Date(`${o.date}T12:00:00Z`))}</T>}
          {r && (
            <T variant="small" muted>
              {t('rate.starsA11y', { n: r.stars })}
            </T>
          )}
          <Chip icon="✖️" label={t('photo.remove')} onPress={() => void removeDiaryPhoto(d.id)} />
        </View>
      ))}
    </Row>
  );
}

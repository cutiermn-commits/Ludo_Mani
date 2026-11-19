import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';

import { SUBCATEGORIES, type Category, type ClothingItem, type Subcategory } from '@/domain/types';
import { useApp } from '@/features/app/AppState';
import { newId } from '@/features/app/dates';
import { PhotoStatus, usePhotoAction } from '@/features/photos/PhotoAction';
import { draftsToDiscard } from '@/features/wardrobe/drafts';
import { ItemTile, itemIcon } from '@/features/wardrobe/visuals';
import type { TKey } from '@/i18n';
import { makeCutout, pickClothes, processPhoto } from '@/services/photos/capture';
import { Button, Card, Chip, Row, Screen, T } from '@/ui/components';
import { space } from '@/ui/theme';

/** Types she can choose, in the order of her body (accessories aren't worn on the picture). */
const WEARABLE: Category[] = ['top', 'outerwear', 'dress', 'bottom', 'shoes'];
const TYPES: { sub: Subcategory; category: Category }[] = WEARABLE.flatMap((category) => SUBCATEGORIES[category].map((sub) => ({ sub: sub as Subcategory, category })));

/**
 * Add or change a piece of clothing (D-061, simple flow): a photo and what it is. Nothing else to
 * fill in. Colours are guessed from the photo in the background (only used to draw clothes whose
 * photo couldn't be cut out). Camera permission approved by the owner 2026-11-17 (D-042).
 */
export default function ItemEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, items, upsertItem, deleteItem, photos } = useApp();
  const action = usePhotoAction();
  /** Photos made during this edit. On save all but the kept ones are deleted; on leaving without saving, all are. */
  const drafts = useRef<string[]>([]);
  const saved = useRef(false);
  /** Result of the last cut-out attempt in this edit (null = none tried). */
  const [cutout, setCutout] = useState<'ok' | 'failed' | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const existing = items.find((i) => i.id === id);
  const [item, setItem] = useState<ClothingItem>(
    () =>
      existing ?? {
        id: newId(),
        category: 'top',
        subcategory: 'tshirt',
        colors: [],
        warmth: 2,
        waterproof: false,
        windproof: false,
        styleTags: [],
        occasions: [],
        favorite: false,
        inLaundry: false,
        createdAt: new Date().toISOString(),
      },
  );
  const set = (p: Partial<ClothingItem>) => setItem((x) => ({ ...x, ...p }));

  const save = async () => {
    // Mark as saved before navigating, so the unmount cleanup can never delete the kept photo.
    saved.current = true;
    try {
      await upsertItem(item); // replaces (and then deletes) the item's previous photo
    } catch {
      saved.current = false;
      setSaveFailed(true);
      return;
    }
    const discard = draftsToDiscard(drafts.current, item);
    drafts.current = [];
    for (const u of discard) await photos.remove(u);
    router.back();
  };

  useEffect(
    () => () => {
      if (!saved.current) for (const u of drafts.current) void photos.remove(u);
    },
    [photos],
  );

  const addPhoto = (source: 'camera' | 'library') =>
    action.run(
      () => pickClothes(source),
      (p) => processPhoto(p, photos),
      ({ photoUri, cutoutUri, cutoutAspect, colors }) => {
        drafts.current.push(photoUri);
        if (cutoutUri) drafts.current.push(cutoutUri);
        setCutout(cutoutUri ? 'ok' : 'failed');
        // A new photo is a new garment shape: her old position tweaks no longer apply.
        setItem((x) => ({ ...x, photoUri, cutoutUri, cutoutAspect, colors, fit: undefined }));
      },
    );

  /** For photos added before cut-outs existed, or to try again. Keeps the photo. */
  const recut = () =>
    item.photoUri &&
    action.run(
      async () => ({ kind: 'ok' as const, uri: item.photoUri!, width: 0, height: 0 }),
      (p) => makeCutout(p, photos),
      (res) => {
        if (!res) return setCutout('failed');
        drafts.current.push(res.cutoutUri);
        setCutout('ok');
        setItem((x) => ({ ...x, cutoutUri: res.cutoutUri, cutoutAspect: res.cutoutAspect, fit: undefined }));
      },
    );

  return (
    <Screen>
      <Card>
        <T variant="heading">{t('item.step1')}</T>
        <T variant="small" muted>
          {t('photo.clothesOnly')}
        </T>
        <View style={{ alignItems: 'center' }}>
          {item.cutoutUri ? (
            <Image source={{ uri: item.cutoutUri }} style={{ width: 180, height: 180 }} resizeMode="contain" accessibilityLabel={t('cutout.previewA11y')} />
          ) : (
            <ItemTile item={item} size={160} showName={false} />
          )}
        </View>
        <PhotoStatus action={action} />
        {action.state !== 'intro' && action.state !== 'working' && (
          <Row wrap style={{ justifyContent: 'center' }}>
            <Chip icon="📷" label={t('photo.take')} onPress={() => action.withCameraIntro(() => void addPhoto('camera'))} />
            <Chip icon="🖼️" label={t('photo.choose')} onPress={() => void addPhoto('library')} />
            {item.photoUri && !item.cutoutUri && <Chip icon="✂️" label={t('cutout.make')} onPress={() => void recut()} />}
          </Row>
        )}
        {(cutout === 'ok' || (cutout === null && item.cutoutUri)) && <T variant="small">{t('cutout.ok')}</T>}
        {(cutout === 'failed' || (cutout === null && item.photoUri && !item.cutoutUri)) && (
          <T variant="small" muted>
            {t('cutout.failed')}
          </T>
        )}
      </Card>

      <Card>
        <T variant="heading">{t('item.step2')}</T>
        <Row wrap>
          {TYPES.map(({ sub, category }) => (
            <Chip key={sub} icon={itemIcon({ category, subcategory: sub })} label={t(`sub.${sub}` as TKey)} selected={item.subcategory === sub} onPress={() => set({ subcategory: sub, category })} />
          ))}
        </Row>
        <Row wrap>
          <Chip icon="🫧" label={t('item.inWash')} selected={item.inLaundry} onPress={() => set({ inLaundry: !item.inLaundry })} />
        </Row>
      </Card>

      <Button label={t('common.save')} onPress={save} disabled={action.state === 'working'} />
      {saveFailed && <T muted>{t('item.saveFailed')}</T>}
      {existing && (
        <Button
          kind="danger"
          label={t('item.delete')}
          onPress={async () => {
            await deleteItem(existing.id);
            router.back();
          }}
        />
      )}
      <View style={{ height: space.lg }} />
    </Screen>
  );
}

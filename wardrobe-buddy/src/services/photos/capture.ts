import { Platform } from 'react-native';

import { base64ToBytes } from '@/domain/image/base64';
import { readGarment, turnImage, type Turn } from '@/domain/fit/garmentShape';
import { detectColors } from '@/domain/image/colorDetect';
import { cutoutBackground } from '@/domain/image/cutout';
import { decodePng } from '@/domain/image/png';
import { encodePng } from '@/domain/image/pngEncode';
import type { ClothingItem, ColorName, GarmentShape } from '@/domain/types';

import { cleanUp, pickImage, resizeAndSave, rotateAndSave, saveJpeg, type Picked, type PickResult } from './pipeline';
import type { PhotoStore } from './types';

export type { PickResult } from './pipeline';

/** Stored photo width. Smaller on web, where photos live in browser storage (~5 MB). ASSUMPTION. */
const PHOTO_WIDTH = Platform.OS === 'web' ? 320 : 900;
const PHOTO_QUALITY = Platform.OS === 'web' ? 0.5 : 0.75;
/** Cut-out working/stored width: enough for the avatar, small for storage. ASSUMPTION. */
const CUTOUT_WIDTH = Platform.OS === 'web' ? 160 : 300;
const THUMB = 24;

/** No forced square crop (D-068): a tight crop cut garments off at the frame, and it was an extra step. */
export const pickClothes = (source: 'camera' | 'library'): Promise<PickResult> => pickImage(source, { crop: false });

export interface ProcessedPhoto {
  photoUri: string;
  /** Garment with transparent background for the avatar; undefined when the background was too busy. */
  cutoutUri?: string;
  cutoutAspect?: number;
  colors: ColorName[];
}

/**
 * Background cut-out (D-059) from an already saved, metadata-free photo. Returns the stored PNG's
 * URI plus colours read from the garment only, or null when the photo isn't suitable.
 */
export async function makeCutout(
  src: Picked,
  store: PhotoStore,
  opts: { purge?: boolean } = {},
): Promise<{ cutoutUri: string; cutoutAspect: number; colors: ColorName[] } | null> {
  const temps: (string | undefined)[] = [];
  try {
    const png = await resizeAndSave(src, CUTOUT_WIDTH, { format: 'png' });
    temps.push(png.uri);
    if (!png.base64) return null;
    const res = cutoutBackground(decodePng(base64ToBytes(png.base64)));
    if (!res.ok) return null;
    const colors = detectColors(res.image, 1);
    // Our encoder writes uncompressed PNG; let the manipulator compress it before storing.
    const raw = await store.temp(encodePng(res.image), 'image/png');
    temps.push(raw);
    const small = await resizeAndSave({ uri: raw, width: res.image.width, height: res.image.height }, CUTOUT_WIDTH, { format: 'png' });
    temps.push(small.uri);
    if (!small.base64) return null;
    const cutoutAspect = Math.round((res.image.width / res.image.height) * 1000) / 1000;
    return { cutoutUri: await store.save(base64ToBytes(small.base64), 'png'), cutoutAspect, colors };
  } catch {
    return null;
  } finally {
    // Inside processPhoto the caller cleans up at the end: purging here would delete the photo
    // the colour fallback still needs (privacy audit). Called on its own ("Make it wearable"), purge.
    if (opts.purge === false) for (const u of temps) if (u) await store.discard(u).catch(() => undefined);
    else await cleanUp(store, temps);
  }
}

/**
 * Clothing photo: resize + re-encode on the device, strip metadata (EXIF can hold GPS), save in
 * the sandbox, try a background cut-out for the avatar, and suggest colours. Nothing leaves the device.
 */
export async function processPhoto(src: Picked, store: PhotoStore): Promise<ProcessedPhoto> {
  const temps: (string | undefined)[] = [src.uri];
  try {
    const jpeg = await resizeAndSave(src, PHOTO_WIDTH, { format: 'jpeg', compress: PHOTO_QUALITY });
    temps.push(jpeg.uri);
    const photoUri = await saveJpeg(jpeg, store);

    const cut = await makeCutout({ uri: jpeg.uri, width: jpeg.width, height: jpeg.height }, store, { purge: false });
    if (cut) return { photoUri, cutoutUri: cut.cutoutUri, cutoutAspect: cut.cutoutAspect, colors: cut.colors };

    // No cut-out: colours from a tiny thumbnail of the whole photo.
    let colors: ColorName[] = [];
    try {
      const thumb = await resizeAndSave({ uri: jpeg.uri, width: THUMB, height: THUMB }, THUMB, { format: 'png' });
      temps.push(thumb.uri);
      if (thumb.base64) colors = detectColors(decodePng(base64ToBytes(thumb.base64)));
    } catch {
      // Colour suggestion is a nice-to-have; she can always pick colours herself.
    }
    return { photoUri, colors };
  } finally {
    await cleanUp(store, temps);
  }
}

export interface ReadGarmentResult {
  cutoutUri: string;
  cutoutAspect: number;
  photoUri?: string;
  shape?: GarmentShape;
  /** Quarter turns (clockwise) applied to the pictures; 0 = unchanged (same URIs). */
  turned: Turn;
}

/**
 * Measures a garment's cut-out for wearing (D-068) and, unless she turned it herself, turns it the
 * right way up. `extraTurn` is her own "turn" button. When the pictures are turned, new files are
 * saved (the caller's item update deletes the old ones). On the device only.
 */
export async function readGarmentPhoto(
  item: Pick<ClothingItem, 'cutoutUri' | 'photoUri' | 'category' | 'subcategory'>,
  store: PhotoStore,
  opts: { extraTurn?: Turn; auto?: boolean } = {},
): Promise<ReadGarmentResult | null> {
  if (!item.cutoutUri) return null;
  const temps: (string | undefined)[] = [];
  try {
    const png = await resizeAndSave({ uri: item.cutoutUri, width: 0, height: 0 }, 4096, { format: 'png' });
    temps.push(png.uri);
    if (!png.base64) return null;
    let img = decodePng(base64ToBytes(png.base64));
    const extra = (opts.extraTurn ?? 0) as Turn;
    img = turnImage(img, extra);
    const read = readGarment(img, item.category, item.subcategory, opts.auto !== false && extra === 0);
    img = turnImage(img, read.turn);
    const turned = ((extra + read.turn) % 4) as Turn;
    const aspect = Math.round((img.width / img.height) * 1000) / 1000;
    if (turned === 0) return { cutoutUri: item.cutoutUri, cutoutAspect: aspect, photoUri: item.photoUri, shape: read.shape, turned };
    const raw = await store.temp(encodePng(img), 'image/png');
    temps.push(raw);
    const small = await resizeAndSave({ uri: raw, width: img.width, height: img.height }, CUTOUT_WIDTH, { format: 'png' });
    temps.push(small.uri);
    if (!small.base64) return null;
    const cutoutUri = await store.save(base64ToBytes(small.base64), 'png');
    let photoUri = item.photoUri;
    if (item.photoUri) {
      const r = await rotateAndSave(item.photoUri, turned * 90, { format: 'jpeg', compress: PHOTO_QUALITY });
      temps.push(r.uri);
      photoUri = await saveJpeg(r, store);
    }
    return { cutoutUri, cutoutAspect: aspect, photoUri, shape: read.shape, turned };
  } catch {
    return null;
  } finally {
    await cleanUp(store, temps);
  }
}

import { Platform } from 'react-native';

import { base64ToBytes } from '@/domain/image/base64';
import { detectColors } from '@/domain/image/colorDetect';
import { cutoutBackground } from '@/domain/image/cutout';
import { decodePng } from '@/domain/image/png';
import { encodePng } from '@/domain/image/pngEncode';
import type { ColorName } from '@/domain/types';

import { cleanUp, pickImage, resizeAndSave, saveJpeg, type Picked, type PickResult } from './pipeline';
import type { PhotoStore } from './types';

export type { PickResult } from './pipeline';

/** Stored photo width. Smaller on web, where photos live in browser storage (~5 MB). ASSUMPTION. */
const PHOTO_WIDTH = Platform.OS === 'web' ? 320 : 900;
const PHOTO_QUALITY = Platform.OS === 'web' ? 0.5 : 0.75;
/** Cut-out working/stored width: enough for the avatar, small for storage. ASSUMPTION. */
const CUTOUT_WIDTH = Platform.OS === 'web' ? 200 : 300;
const THUMB = 24;

export const pickClothes = (source: 'camera' | 'library'): Promise<PickResult> => pickImage(source, { aspect: [1, 1] });

export interface ProcessedPhoto {
  photoUri: string;
  /** Garment with transparent background for the avatar; undefined when the background was too busy. */
  cutoutUri?: string;
  colors: ColorName[];
}

/**
 * Background cut-out (D-059) from an already saved, metadata-free photo. Returns the stored PNG's
 * URI plus colours read from the garment only, or null when the photo isn't suitable.
 */
export async function makeCutout(src: Picked, store: PhotoStore): Promise<{ cutoutUri: string; colors: ColorName[] } | null> {
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
    return { cutoutUri: await store.save(base64ToBytes(small.base64), 'png'), colors };
  } catch {
    return null;
  } finally {
    await cleanUp(store, temps);
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

    const cut = await makeCutout({ uri: jpeg.uri, width: jpeg.width, height: jpeg.height }, store);
    if (cut) return { photoUri, cutoutUri: cut.cutoutUri, colors: cut.colors };

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

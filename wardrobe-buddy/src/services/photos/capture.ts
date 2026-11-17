import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { base64ToBytes } from '@/domain/image/base64';
import { detectColors } from '@/domain/image/colorDetect';
import { decodePng } from '@/domain/image/png';
import type { ColorName } from '@/domain/types';

import { cleanUp, pickImage, release, resizeAndSave, saveJpeg, type Picked, type PickResult } from './pipeline';
import type { PhotoStore } from './types';

export type { PickResult } from './pipeline';

/** Stored photo width. Smaller on web, where photos live in browser storage (~5 MB). ASSUMPTION. */
const PHOTO_WIDTH = Platform.OS === 'web' ? 320 : 900;
const PHOTO_QUALITY = Platform.OS === 'web' ? 0.5 : 0.75;
const THUMB = 24;

export const pickClothes = (source: 'camera' | 'library'): Promise<PickResult> => pickImage(source, { aspect: [1, 1] });

/**
 * Clothing photo: resize + re-encode on the device, strip metadata (EXIF can hold GPS), save in
 * the sandbox, and suggest colours from a tiny thumbnail. Nothing leaves the device.
 */
export async function processPhoto(src: Picked, store: PhotoStore): Promise<{ photoUri: string; colors: ColorName[] }> {
  const temps: (string | undefined)[] = [src.uri];
  try {
    const jpeg = await resizeAndSave(src, PHOTO_WIDTH, { format: 'jpeg', compress: PHOTO_QUALITY });
    temps.push(jpeg.uri);
    const photoUri = await saveJpeg(jpeg, store);

    let colors: ColorName[] = [];
    try {
      const t = ImageManipulator.manipulate(jpeg.uri);
      t.resize({ width: THUMB, height: THUMB });
      const ref = await t.renderAsync();
      const thumb = await ref.saveAsync({ format: SaveFormat.PNG, base64: true });
      release(ref);
      release(t);
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

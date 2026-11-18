import { Platform } from 'react-native';

import { base64ToBytes } from '@/domain/image/base64';
import { blurTop } from '@/domain/image/blur';
import { decodePng } from '@/domain/image/png';
import { encodePng } from '@/domain/image/pngEncode';

import { cleanUp, pickImage, resizeAndSave, saveJpeg, type Picked, type PickResult } from './pipeline';
import type { PhotoStore } from './types';

/** Selfie width. Small on purpose: it is only shown as a profile picture. ASSUMPTION. */
const SELFIE_WIDTH = 360;
/** Full-body photo for trying clothes on: big enough to look good, small for browser storage. ASSUMPTION. */
const BODY_WIDTH = Platform.OS === 'web' ? 420 : 720;

/** Full-body photo of herself (D-063). Back camera: someone else takes it, or she picks a mirror photo. */
export const pickBodyPhoto = (source: 'camera' | 'library'): Promise<PickResult> => pickImage(source, { aspect: [3, 4] });

/**
 * Full-body photo → resized JPEG without metadata → sandbox. NOT blurred: the owner chose to test
 * with a clear photo first (D-063, 2026-11-18); blurring is to be decided before a store release.
 * The picker's and manipulator's copies are deleted on success and on error.
 */
export async function processBodyPhoto(src: Picked, store: PhotoStore): Promise<{ uri: string; aspect: number; width: number; height: number }> {
  const temps: (string | undefined)[] = [src.uri];
  try {
    const jpeg = await resizeAndSave(src, BODY_WIDTH, { format: 'jpeg', compress: 0.8 });
    temps.push(jpeg.uri);
    const uri = await saveJpeg(jpeg, store);
    return { uri, aspect: Math.round((jpeg.width / jpeg.height) * 1000) / 1000, width: jpeg.width, height: jpeg.height };
  } finally {
    await cleanUp(store, temps);
  }
}

export const pickSelfie = (source: 'camera' | 'library'): Promise<PickResult> => pickImage(source, { aspect: [3, 4], front: source === 'camera' });

/**
 * Selfie → small PNG → face area blurred in our own code → JPEG without metadata → sandbox.
 * `whole: true` blurs the entire photo. The unblurred image is never saved: the picker's and
 * manipulator's cache copies and our temp files are deleted on success and on error (D-045).
 * Also used to re-blur an already saved (blurred) selfie more strongly.
 */
export async function processSelfie(src: Picked, store: PhotoStore, opts: { whole?: boolean; deleteSource?: boolean } = {}): Promise<string> {
  const temps: (string | undefined)[] = opts.deleteSource === false ? [] : [src.uri];
  try {
    const png = await resizeAndSave(src, SELFIE_WIDTH, { format: 'png' });
    temps.push(png.uri);
    if (!png.base64) throw new Error('no image data');
    const blurred = encodePng(blurTop(decodePng(base64ToBytes(png.base64)), opts.whole ? { blurShare: 1 } : {}));
    const blurredUri = await store.temp(blurred, 'image/png');
    temps.push(blurredUri);
    const jpeg = await resizeAndSave({ uri: blurredUri, width: png.width, height: png.height }, SELFIE_WIDTH, { format: 'jpeg', compress: 0.8 });
    temps.push(jpeg.uri);
    return await saveJpeg(jpeg, store);
  } finally {
    await cleanUp(store, temps);
  }
}

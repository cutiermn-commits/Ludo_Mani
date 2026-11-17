import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { base64ToBytes } from '@/domain/image/base64';
import { detectColors } from '@/domain/image/colorDetect';
import { stripJpegMetadata } from '@/domain/image/jpeg';
import { decodePng } from '@/domain/image/png';
import type { ColorName } from '@/domain/types';

import type { PhotoStore } from './types';

/** Stored photo width. Smaller on web, where photos live in browser storage. ASSUMPTION. */
const PHOTO_WIDTH = Platform.OS === 'web' ? 480 : 900;
const PHOTO_QUALITY = Platform.OS === 'web' ? 0.6 : 0.75;
const THUMB = 24;

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
  exif: false,
  base64: false,
};

export type PickResult = { kind: 'ok'; uri: string } | { kind: 'canceled' } | { kind: 'denied'; canAskAgain: boolean };

/** Photo library: no permission prompt needed for the system picker (Expo SDK 58 docs, ImagePicker usage). */
export async function pickFromLibrary(): Promise<PickResult> {
  const res = await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS);
  return res.canceled || !res.assets[0] ? { kind: 'canceled' } : { kind: 'ok', uri: res.assets[0].uri };
}

/** Camera: asks for permission only now, after our own kid-friendly explanation (PRIVACY_SAFETY §2.4). */
export async function takePhoto(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { kind: 'denied', canAskAgain: perm.canAskAgain };
  const res = await ImagePicker.launchCameraAsync(PICK_OPTIONS);
  return res.canceled || !res.assets[0] ? { kind: 'canceled' } : { kind: 'ok', uri: res.assets[0].uri };
}

/**
 * Resize + re-encode on the device, strip metadata (EXIF can hold GPS), save in the sandbox,
 * and suggest colours from a tiny centre thumbnail. Nothing leaves the device.
 */
export async function processPhoto(sourceUri: string, store: PhotoStore): Promise<{ photoUri: string; colors: ColorName[] }> {
  // Both sizes are passed explicitly: with `height: null` the web implementation produced NaN
  // (seen in testing 2026-11-17), although the docs say the other side is calculated.
  const loaded = await ImageManipulator.manipulate(sourceUri, { maxWidth: 2048, maxHeight: 2048 }).renderAsync();
  const width = Math.min(PHOTO_WIDTH, loaded.width);
  const height = Math.max(1, Math.round((loaded.height * width) / loaded.width));
  const ctx = ImageManipulator.manipulate(loaded);
  ctx.resize({ width, height });
  const img = await ctx.renderAsync();
  const saved = await img.saveAsync({ format: SaveFormat.JPEG, compress: PHOTO_QUALITY, base64: true });
  if (!saved.base64) throw new Error('no image data');
  const photoUri = await store.save(stripJpegMetadata(base64ToBytes(saved.base64)));

  let colors: ColorName[] = [];
  try {
    const t = ImageManipulator.manipulate(saved.uri);
    t.resize({ width: THUMB, height: THUMB });
    const thumb = await (await t.renderAsync()).saveAsync({ format: SaveFormat.PNG, base64: true });
    if (thumb.base64) colors = detectColors(decodePng(base64ToBytes(thumb.base64)));
  } catch {
    // Colour suggestion is a nice-to-have; she can always pick colours herself.
  }
  return { photoUri, colors };
}

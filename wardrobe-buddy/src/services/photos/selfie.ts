import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { base64ToBytes } from '@/domain/image/base64';
import { blurTop } from '@/domain/image/blur';
import { stripJpegMetadata } from '@/domain/image/jpeg';
import { decodePng } from '@/domain/image/png';
import { encodePng } from '@/domain/image/pngEncode';

import type { PickResult } from './capture';
import type { PhotoStore } from './types';

/** Selfie width. Small on purpose: it is shown as a profile picture only. ASSUMPTION. */
const SELFIE_WIDTH = 360;

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [3, 4],
  quality: 1,
  exif: false,
  base64: false,
};

export async function takeSelfie(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { kind: 'denied', canAskAgain: perm.canAskAgain };
  // Front camera; on Android this depends on the phone's camera app (Expo SDK 58 docs).
  const res = await ImagePicker.launchCameraAsync({ ...OPTIONS, cameraType: ImagePicker.CameraType.front });
  return res.canceled || !res.assets[0] ? { kind: 'canceled' } : { kind: 'ok', uri: res.assets[0].uri };
}

export async function pickSelfie(): Promise<PickResult> {
  const res = await ImagePicker.launchImageLibraryAsync(OPTIONS);
  return res.canceled || !res.assets[0] ? { kind: 'canceled' } : { kind: 'ok', uri: res.assets[0].uri };
}

/**
 * Selfie → small → face area blurred in our own code → JPEG without metadata → sandbox.
 * The unblurred image is never saved: only the picker's own cache copy and our temp
 * files exist briefly, and they are deleted here (D-045).
 */
export async function processSelfie(sourceUri: string, store: PhotoStore): Promise<string> {
  const temps: string[] = [];
  try {
    const loaded = await ImageManipulator.manipulate(sourceUri, { maxWidth: 2048, maxHeight: 2048 }).renderAsync();
    const width = Math.min(SELFIE_WIDTH, loaded.width);
    const height = Math.max(1, Math.round((loaded.height * width) / loaded.width));
    const small = ImageManipulator.manipulate(loaded);
    small.resize({ width, height });
    const png = await (await small.renderAsync()).saveAsync({ format: SaveFormat.PNG, base64: true });
    temps.push(png.uri);
    if (!png.base64) throw new Error('no image data');

    const blurred = encodePng(blurTop(decodePng(base64ToBytes(png.base64))));
    const blurredUri = await store.temp(blurred, 'image/png');
    temps.push(blurredUri);

    const jpeg = await (await ImageManipulator.manipulate(blurredUri).renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    temps.push(jpeg.uri);
    if (!jpeg.base64) throw new Error('no image data');
    return await store.save(stripJpegMetadata(base64ToBytes(jpeg.base64)));
  } finally {
    for (const uri of [sourceUri, ...temps]) await store.discard(uri).catch(() => undefined);
  }
}

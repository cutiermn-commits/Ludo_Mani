import { ImageManipulator, SaveFormat, type ImageResult } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { base64ToBytes } from '@/domain/image/base64';
import { stripJpegMetadata } from '@/domain/image/jpeg';

import type { PhotoStore } from './types';

/** What the picker gave us. Width/height come from the picker so we can resize in one step. */
export interface Picked {
  uri: string;
  width: number;
  height: number;
}

export type PickResult = ({ kind: 'ok' } & Picked) | { kind: 'canceled' } | { kind: 'denied'; canAskAgain: boolean };

/**
 * One way to pick a photo. The library uses the system picker (no permission prompt, Expo SDK 58
 * docs); the camera asks for permission only now, after the app's own explanation (PRIVACY_SAFETY §2.4).
 */
export async function pickImage(source: 'camera' | 'library', opts: { aspect?: [number, number]; crop?: boolean; front?: boolean }): Promise<PickResult> {
  const crop = opts.crop !== false && !!opts.aspect;
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: crop,
    ...(crop ? { aspect: opts.aspect } : {}),
    quality: 1,
    exif: false,
    base64: false,
    // Front camera on Android depends on the phone's camera app (Expo SDK 58 docs).
    ...(opts.front ? { cameraType: ImagePicker.CameraType.front } : {}),
  };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { kind: 'denied', canAskAgain: perm.canAskAgain };
  }
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const a = res.canceled ? undefined : res.assets[0];
  return a ? { kind: 'ok', uri: a.uri, width: a.width, height: a.height } : { kind: 'canceled' };
}

/** Free native image memory now instead of waiting for garbage collection. */
export function release(obj: unknown): void {
  try {
    (obj as { release?: () => void } | undefined)?.release?.();
  } catch {
    // already released
  }
}

/**
 * Resize to `targetWidth` (never upscale) in one step and save. Both sizes are passed explicitly:
 * with `height: null` the web implementation produced NaN (seen in testing 2026-11-17).
 */
export async function resizeAndSave(
  src: Picked,
  targetWidth: number,
  save: { format: 'jpeg' | 'png'; compress?: number },
): Promise<ImageResult> {
  let width = src.width;
  let height = src.height;
  if (!(width > 0 && height > 0)) {
    // Size unknown (some web pickers): measure first.
    const probe = await ImageManipulator.manipulate(src.uri).renderAsync();
    width = probe.width;
    height = probe.height;
    release(probe);
  }
  const w = Math.max(1, Math.min(targetWidth, width));
  const h = Math.max(1, Math.round((height * w) / width));
  const ctx = ImageManipulator.manipulate(src.uri);
  // On phones only the width is given: the manipulator keeps the picture's real proportions even if
  // the picker reported its size the wrong way round for a turned camera photo (D-068). The browser
  // needs both (with height null it produced NaN, 2026-11-17); there sizes come from the image itself.
  ctx.resize(Platform.OS === 'web' ? { width: w, height: h } : { width: w });
  const ref = await ctx.renderAsync();
  try {
    return await ref.saveAsync({ format: save.format === 'png' ? SaveFormat.PNG : SaveFormat.JPEG, compress: save.compress, base64: true });
  } finally {
    release(ref);
    release(ctx);
  }
}

/** Turns a picture by a multiple of 90° (clockwise) and saves it. */
export async function rotateAndSave(uri: string, degrees: number, save: { format: 'jpeg' | 'png'; compress?: number }): Promise<ImageResult> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.rotate(degrees);
  const ref = await ctx.renderAsync();
  try {
    return await ref.saveAsync({ format: save.format === 'png' ? SaveFormat.PNG : SaveFormat.JPEG, compress: save.compress, base64: true });
  } finally {
    release(ref);
    release(ctx);
  }
}

/** JPEG bytes → metadata stripped → saved in the sandbox. */
export async function saveJpeg(result: ImageResult, store: PhotoStore): Promise<string> {
  if (!result.base64) throw new Error('no image data');
  return store.save(stripJpegMetadata(base64ToBytes(result.base64)));
}

/** Always run after processing, on success and on error: picker/manipulator copies may hold EXIF or an unblurred face. */
export async function cleanUp(store: PhotoStore, uris: (string | undefined)[]): Promise<void> {
  for (const uri of uris) if (uri) await store.discard(uri).catch(() => undefined);
  await store.purgeCaches().catch(() => undefined);
}
